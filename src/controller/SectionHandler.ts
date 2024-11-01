import JSZip from "jszip";
import Section from "./Section";
import { InsightError } from "./IInsightFacade";

export class SectionHandler {
	public async extractSections(zip: JSZip): Promise<Section[]> {
		const fileNames = Object.keys(zip.files).filter(
			(fileName) => fileName.startsWith("courses/") && !zip.files[fileName].dir
		);
		const sectionPromises = fileNames.map(async (fileName) => this.processSectionsFile(zip, fileName));
		const sectionResults = await Promise.all(sectionPromises);
		return sectionResults.flat();
	}

	private async processSectionsFile(zip: JSZip, fileName: string): Promise<Section[]> {
		const file = zip.files[fileName];
		try {
			const fileContent = await file.async("text");
			const parsedJSON = JSON.parse(fileContent);
			return this.extractValidSections(parsedJSON);
		} catch {
			throw new InsightError(`Error processing file ${fileName}`);
		}
	}

	private extractValidSections(parsedJSON: any): Section[] {
		if (parsedJSON && Array.isArray(parsedJSON.result)) {
			return parsedJSON.result
				.map((section: any) => this.createSectionFromJson(section))
				.filter((section: Section | null) => section !== null) as Section[];
		}
		return [];
	}

	private createSectionFromJson(section: any): Section | null {
		const overallSectionReplacementYear = 1900;
		const year = section.Section === "overall" ? overallSectionReplacementYear : section.Year;

		if (
			"id" in section &&
			"Course" in section &&
			"Title" in section &&
			"Professor" in section &&
			"Subject" in section &&
			"Year" in section &&
			"Avg" in section &&
			"Pass" in section &&
			"Fail" in section &&
			"Audit" in section
		) {
			return new Section(
				section.id,
				section.Course,
				section.Title,
				section.Professor,
				section.Subject,
				year,
				section.Avg,
				section.Pass,
				section.Fail,
				section.Audit
			);
		}
		return null;
	}
}
