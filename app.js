const fs = require("fs");
const { parse } = require("csv-parse");
const contentful = require("contentful-management");
const argv = require("minimist")(process.argv.slice(2));

const client = contentful.createClient({
  accessToken: argv.token,
});

async function main() {
  const space = await client.getSpace(argv.space);
  const environment = await space.getEnvironment(argv.env);
  const parser = parse({ columns: true, bom: true });
  const chunks = fs.createReadStream("./example.csv").pipe(parser);

  for await (const chunk of chunks) {
    const entry = await rowToEntry(environment, chunk);
    entry.publish();
  }
}

async function rowToEntry(env, row) {
  const asset = await env.createAssetFromFiles({
    fields: {
      title: {
        "en-US": row.Name,
      },
      file: {
        "en-US": {
          contentType: "image/jpeg",
          fileName: row.Picture,
          file: fs.createReadStream(`images/${row.Picture}`),
        },
      },
    },
  });
  const assetToPublish = await asset.processForAllLocales();
  await assetToPublish.publish();
  return await env.createEntry("author", {
    fields: {
      name: {
        "en-US": row.Name,
      },
      picture: {
        "en-US": {
          sys: {
            id: assetToPublish.sys.id,
            linkType: "Asset",
            type: "Link",
          },
        },
      },
    },
  });
}

main().catch(console.error);
