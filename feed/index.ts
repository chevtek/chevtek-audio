import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as Podcast from "podcast";
import * as fs from "fs";
import * as util from "util";
const readFileAsync = util.promisify(fs.readFile);

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const showName = context.bindingData.showName;
    const showInfo = await readFileAsync(`./feed/${showName}.json`);
    const showRss = new Podcast(JSON.parse(showInfo.toString()));
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/xml"
      },
      body: showRss.buildXml("    ")
    };
  } catch (err) {
    context.log.error("ERROR", err);
    throw err;
  }
};

export default httpTrigger;
