import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const imageName = context.bindingData.imageName;
    const sharedAccessSignature = process.env.podcastcoverart_SHARED_ACCESS_SIGNATURE;
    const storageAccount = "chevtekpodcasts";
    const redirectUrl = `https://${storageAccount}.blob.core.windows.net/podcast-cover-art/${imageName}?${sharedAccessSignature}`;

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
