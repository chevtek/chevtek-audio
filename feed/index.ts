import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { ShareServiceClient } from "@azure/storage-file-share";
import * as Podcast from "podcast";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    // Pull podcast name from URL.
    const { podcastName } = context.bindingData;

    // Pull podcast JSON metadata from azure storage file share.
    const serviceClient = ShareServiceClient.fromConnectionString(process.env["chevtekpodcasts_STORAGE"]);
    const fileClient = serviceClient
      .getShareClient("feeds")
      .rootDirectoryClient
      .getFileClient(`${podcastName}.json`);
    const fileResponse = await fileClient.download();
    const podcastData = JSON.parse(await streamToString(fileResponse.readableStreamBody));

    // Create the podcast feed.
    const podcastFeed = new Podcast(podcastData);

    // Find all podcast entries from azure blob storage.
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env["chevtekpodcasts_STORAGE"]);
    const containerClient = blobServiceClient.getContainerClient(podcastName);
    const blobs = await containerClient.listBlobsFlat({ includeMetadata: true });

    // Iterate over each blob and read the metadata into a podcast feed entry.
    for await (const blob of blobs) {
      if (blob.metadata.isLive) {
        let episodeUrl = `${process.env.PROTOCOL}://${process.env.ANALYTICS_PREFIX}${process.env.DOMAIN}/episode/${podcastName}/${blob.name}`;
        podcastFeed.addItem({
          title: blob.metadata.title,
          description: blob.metadata.description,
          url: episodeUrl,
          date: blob.metadata.date || blob.properties.createdOn,
          enclosure: {
            url: episodeUrl,
            size: blob.properties.contentLength,
            type: blob.properties.contentType
          },
          itunesAuthor: podcastData.itunesAuthor,
          itunesExplicit: false,
          itunesSubtitle: blob.metadata.subtitle,
          itunesSummary: blob.metadata.description,
          itunesTitle: blob.metadata.title,
          itunesDuration: blob.metadata.duration,
          itunesEpisodeType: blob.metadata.epidodeType || "full", // Can be "full", "trailer", or "bonus"
          itunesSeason: blob.metadata.season || "",
          itunesEpisode: blob.metadata.episode || "",
          itunesKeywords: blob.metadata.keywords ? blob.metadata.keywords.split(',') : ""
        });
      }
    }

    // Return the response.
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/xml"
      },
      body: podcastFeed.buildXml("    ")
    };
  } catch (err) {
    context.log.error("ERROR", err);
    throw err;
  }
};

// [Node.js only] A helper method used to read a Node.js readable stream into string
async function streamToString(readableStream) {
  return new Promise<string>((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data.toString());
    });
    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream.on("error", reject);
  });
}

export default httpTrigger;
