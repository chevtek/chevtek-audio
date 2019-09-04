import { AzureFunction, Context, HttpRequest } from "@azure/functions";
// import { BlobServiceClient, SharedKeyCredential } from "@azure/storage-blob";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const podcastName = context.bindingData.podcastName;
    const episodeName = context.bindingData.episodeName;
    const sharedAccessSignature = process.env[`${podcastName}_SHARED_ACCESS_SIGNATURE`];
    const storageAccount = "chevtekpodcasts";
    const redirectUrl = `https://${storageAccount}.blob.core.windows.net/${podcastName}/${episodeName}?${sharedAccessSignature}`;

    // todo: actually read from the blob instead of redirect to SAS URL.
    // const sharedKeyCredential = new SharedKeyCredential(storageAccount, process.env.chevtekpodcasts_ACCESS_KEY);
    // const blobServiceClient = new BlobServiceClient(`https://${storageAccount}.blob.core.windows.net`, sharedKeyCredential);
    // const containerClient = blobServiceClient.getContainerClient(podcastName);
    // const blobClient = containerClient.getBlobClient(episodeName);
    // const blobProperties = await blobClient.getProperties();

    context.res = {
      status: 302,
      headers: {
        "Location": redirectUrl
      },
      body: ""
    };
  } catch (err) {
    context.log.error("ERROR", err);
    throw err;
  }
};

export default httpTrigger;
