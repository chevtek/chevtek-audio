import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient, SharedKeyCredential } from "@azure/storage-blob";
import * as Podcast from "podcast";
import * as fs from "fs";
import * as util from "util";
const readFileAsync = util.promisify(fs.readFile);

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const podcastName = context.bindingData.podcastName;
    const podcastData = JSON.parse((await readFileAsync(`./feed/${podcastName}.json`)).toString());
    const podcastFeed = new Podcast(podcastData);

    const storageAccount = "chevtekpodcasts";
    const sharedKeyCredential = new SharedKeyCredential(storageAccount, process.env.chevtekpodcasts_ACCESS_KEY);
    const blobServiceClient = new BlobServiceClient(`https://${storageAccount}.blob.core.windows.net`, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(podcastName);

    const blobs = await containerClient.listBlobsFlat({ include: ["metadata"] });
    for await (const blob of blobs) {
      let episodeUrl = `${process.env.PROTOCOL}://${process.env.ANALYTICS_PREFIX}${process.env.DOMAIN}/episode/${podcastName}/${blob.name}`;
      podcastFeed.addItem({
        title: blob.metadata.title,
        description: blob.metadata.description,
        url: episodeUrl,
        date: blob.metadata.date || blob.properties.creationTime,
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

export default httpTrigger;
