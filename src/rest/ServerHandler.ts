import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import InsightFacade from "../controller/InsightFacade";
import { InsightDatasetKind, InsightError, NotFoundError } from "../controller/IInsightFacade";
import Log from "@ubccpsc310/folder-test/build/Log";

export class ServerHandler {
	private InsightInstance = new InsightFacade();
	public async datasetPut(req: Request, res: Response): Promise<any> {
		try {
			const bufferData = req.body;
			const id = req.params.id;
			const kind = req.params.kind as InsightDatasetKind;
			if (!Buffer.isBuffer(bufferData)) {
				return res.status(StatusCodes.BAD_REQUEST).json({ error: "Error with data" });
			}

			try {
				const base64Data = bufferData.toString("base64");
				const result = await this.InsightInstance.addDataset(id, base64Data, kind);
				return res.status(StatusCodes.OK).json({ result: result });
			} catch (err: any) {
				Log.error("Error with calling fn" + err);
				const errorObj = { error:err.message };
				return res.status(StatusCodes.BAD_REQUEST).json(errorObj);
			}
		} catch (error) {
			Log.error("Error before calling fn" + error);
		}
	}

	public async datasetDelete(req: Request, res: Response): Promise<any> {
		try {
			const id = req.params.id;
			try {
				const result = await this.InsightInstance.removeDataset(id);
				return res.status(StatusCodes.OK).json({ result: result });
			} catch (error) {
				if (error instanceof InsightError) {
					return res.status(StatusCodes.BAD_REQUEST).json({ error: "error with fn" });
				} else if (error instanceof NotFoundError) {
					return res.status(StatusCodes.NOT_FOUND).json({ error: "not found dataset" });
				} else {
					return res.status(StatusCodes.BAD_REQUEST).json({ error: "other error" });
				}
			}
		} catch (error) {
			Log.error("error before calling fn" + error);
		}
	}

	public async datasetQuery(req: Request, res: Response): Promise<any> {
		try {
			const query = req.body;
			try {
				const result = await this.InsightInstance.performQuery(query);
				return res.status(StatusCodes.OK).json({ result: result });
			} catch (error: any) {
				return res.status(StatusCodes.BAD_REQUEST).json({ error: "Error with query " + error.msg });
			}
		} catch (error) {
			Log.error("error before calling fn" + error);
		}
	}

	public async datasetGet(_: Request, res: Response): Promise<any> {
		try {
			const result = await this.InsightInstance.listDatasets();
			return res.status(StatusCodes.OK).json({ result: result });
		} catch (error) {
			Log.error("error before caling fn" + error);
		}
	}
}
