import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";
import {rejects} from "node:assert";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (this.validId(id)) {
			try {
				const zip = await JSZip.loadAsync(content, {base64:true});
			} catch (err) {
				throw(new InsightError("JSZip threw error:"));
			}
			return([id])
		} else {
			throw(new InsightError("id was invalid!"));
		}

		/*
		* An id is invalid if it contains an underscore, or is only whitespace characters.
		* If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
		*/

		/* After receiving the dataset, it should be processed into a data structure of
		* your design. The processed data structure should be persisted to disk; your
		* system should be able to load this persisted value into memory for answering
		* queries.
		*
		* Ultimately, a dataset must be added or loaded from disk before queries can
		* be successfully answered.
		*/
	}

	private validId(id: string): boolean {
		const regex = new RegExp("^[^_]+$");
		return regex.test(id) && id.trim().length !== 0;
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
