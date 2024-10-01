import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let oneCourse: string;
	let anotherOneCourse: string;
	let threeCourses: string;
	let emptyDataset: string;
	let invalidSection: string;
	let validSectionsWhitespace: string;
	let notGonnaWork: string;
	let emptyJSON: string;
	let noSectionsAtAll: string;
	let notInCoursesFolder: string;
	let notJSONFormat: string;
	let noValidSections: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		oneCourse = await getContentFromArchives("OneCourse.zip");
		anotherOneCourse = await getContentFromArchives("AnotherOneCourse.zip");
		threeCourses = await getContentFromArchives("ThreeCourses.zip");
		emptyDataset = await getContentFromArchives("empty.zip");
		invalidSection = await getContentFromArchives("InvalidSection.zip");
		validSectionsWhitespace = await getContentFromArchives("ValidSectionsWhitespace.zip");
		notGonnaWork = await getContentFromArchives("NotGonnaWork.txt");
		notInCoursesFolder = await getContentFromArchives("NotInCoursesFolder.zip");
		emptyJSON = await getContentFromArchives("emptyJSON.zip");
		noSectionsAtAll = await getContentFromArchives("noSectionsAtAll.zip");
		noValidSections = await getContentFromArchives("NoValidSections.zip");
		notJSONFormat = await getContentFromArchives("notJSONFormat.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		//rejections due to dataset id
		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a whitespace dataset id", async function () {
			try {
				await facade.addDataset("   ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a _ dataset id", async function () {
			try {
				await facade.addDataset("_", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a _dataset id", async function () {
			try {
				await facade.addDataset("_dataset", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a dataset_ id", async function () {
			try {
				await facade.addDataset("dataset_", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a data_set id", async function () {
			try {
				await facade.addDataset("data_set", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a non-zip file", async function () {
			try {
				await facade.addDataset("notazip", notGonnaWork, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when not in courses folder", async function () {
			try {
				await facade.addDataset("notInCoursesFolder", notInCoursesFolder, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		//A valid dataset:
		//	Is a structured as a base64 string of a zip file.
		// 	Contains at least one valid section.
		// A valid course:
		// 	Is a JSON formatted file.
		// 	Contains one or more valid sections.
		// 		Within a JSON formatted file, valid sections will be found within the "result" key.
		// 	Is located within a folder called courses/ in the zip's root directory.
		// A valid section:
		// 	Contains every field which can be used by a query (see the "Valid Query Keys" section below).
		// 	If a field you use in a section is present in the JSON but contains something counter-intuitive like empty string, it is still valid.

		//datasets with
		//only an invalid sections
		it("should reject due to being only an invalid section", async function () {
			try {
				await facade.addDataset("invalidSection", invalidSection, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when blank JSON", async function () {
			try {
				await facade.addDataset("emptyJSON", emptyJSON, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when no sections at all", async function () {
			try {
				await facade.addDataset("noSectionsAtAll", noSectionsAtAll, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when not in JSON Format", async function () {
			try {
				await facade.addDataset("notJSONFormat", notJSONFormat, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when no valid sections", async function () {
			try {
				await facade.addDataset("noValidSections", noValidSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		//two valid sections but empty string as avg fields
		it("should resolve with several valid sections and one with an empty string field", async function () {
			try {
				const result = await facade.addDataset(
					"validSectionsWhitespace",
					validSectionsWhitespace,
					InsightDatasetKind.Sections
				);
				expect(result).to.deep.equals(["validSectionsWhitespace"]);
			} catch {
				expect.fail("Should not have thrown!");
			}
		});

		//several valid and several invalid sections?

		//nothing in the /courses/ folder

		it("should reject with valid id but invalid (empty) dataset", async function () {
			try {
				await facade.addDataset("emptyDataset", emptyDataset, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		//tests for successful resolution:

		it("should resolve with valid id and valid dataset", async function () {
			try {
				const result = await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				expect(result).to.deep.equals(["oneCourse"]);
			} catch {
				expect.fail("Should not have thrown!");
			}
		});

		it("should reject with same id twice", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should resolve with 3 valid ids and 3 valid datasets", async function () {
			try {
				const result = await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				expect(result).to.deep.equals(["oneCourse"]);
			} catch {
				expect.fail("Should not have thrown after 1 addition!");
			}

			try {
				const result = await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				expect(result).to.deep.equals(["oneCourse", "anotherOneCourse"]);
			} catch {
				expect.fail("Should not have thrown after 2 additions!");
			}

			try {
				const result = await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				expect(result).to.deep.equals(["oneCourse", "anotherOneCourse", "threeCourses"]);
			} catch {
				expect.fail("Should not have thrown after 3 additions!");
			}
		});

		it("should resolve with 3 valid ids, 3 valid datasets and 1 removal", async function () {
			try {
				const result = await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				expect(result).to.deep.equals(["oneCourse"]);
			} catch {
				expect.fail("Should not have thrown after 1 addition!");
			}

			try {
				const result = await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				expect(result).to.deep.equals(["oneCourse", "anotherOneCourse"]);
			} catch {
				expect.fail("Should not have thrown after 2 additions!");
			}

			try {
				const result = await facade.removeDataset("anotherOneCourse");
				expect(result).to.deep.equals("anotherOneCourse");
			} catch {
				expect.fail("Should not have thrown upon removal!");
			}

			try {
				const result = await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				expect(result).to.deep.equals(["oneCourse", "threeCourses"]);
			} catch {
				expect.fail("Should not have thrown after 3 additions, 1 removal!");
			}
		});
	});

	describe("removeDataset", function () {
		beforeEach(function () {
			facade = new InsightFacade();
		});

		afterEach(async function () {
			await clearDisk();
		});

		//invalid id removal tests
		it("should not remove with empty dataset id", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should not remove with a whitespace dataset id", async function () {
			try {
				await facade.removeDataset("   ");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should not remove with a _ dataset id", async function () {
			try {
				await facade.removeDataset("_");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should not remove with a _dataset id", async function () {
			try {
				await facade.removeDataset("_dataset");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should not remove with a dataset_ id", async function () {
			try {
				await facade.removeDataset("dataset_");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should not remove with a data_set id", async function () {
			try {
				await facade.removeDataset("data_set");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		//valid id (not yet added) removal tests
		it("should not remove for not yet added id no additions", async function () {
			try {
				await facade.removeDataset("oneCourse");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should not remove for not yet added id three additions", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				await facade.removeDataset("oneCourses");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		//successful removal test
		it("should resolve for removal of added id", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("oneCourse");
				expect(result).to.deep.equals("oneCourse");
			} catch {
				expect.fail("Should not have thrown!");
			}
		});

		it("should resolve for removal of other added id", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("anotherOneCourse");
				expect(result).to.deep.equals("anotherOneCourse");
			} catch {
				expect.fail("Should not have thrown!");
			}
		});

		//several successful removals test
		it("should resolve for removal of several added ids", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("anotherOneCourse");
				expect(result).to.deep.equals("anotherOneCourse");
				const result2 = await facade.removeDataset("threeCourses");
				expect(result2).to.deep.equals("threeCourses");
			} catch {
				expect.fail("Should not have thrown!");
			}
		});

		//all datasets removed test
		it("should resolve for removal of several added ids opt 2", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("anotherOneCourse");
				expect(result).to.deep.equals("anotherOneCourse");
				const result2 = await facade.removeDataset("threeCourses");
				expect(result2).to.deep.equals("threeCourses");
				const result3 = await facade.removeDataset("oneCourse");
				expect(result3).to.deep.equals("oneCourse");
			} catch {
				expect.fail("Should not have thrown!");
			}
		});

		//all removed one added test
		it("should resolve for removal of several added ids opt 3", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("anotherOneCourse");
				expect(result).to.deep.equals("anotherOneCourse");
				const result2 = await facade.removeDataset("threeCourses");
				expect(result2).to.deep.equals("threeCourses");
				const result3 = await facade.removeDataset("oneCourse");
				expect(result3).to.deep.equals("oneCourse");
				const result4 = await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				expect(result4).to.deep.equals(["anotherOneCourse"]);
			} catch {
				expect.fail("Should not have thrown!");
			}
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);

			let result: InsightResult[];

			try {
				result = await facade.performQuery(input);
				// If we get here, performQuery succeeded - check if an error was expected
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}
				// If no error is expected, verify that the result matches the expected output
				expect(result).to.deep.equal(expected);
			} catch (err) {
				// If performQuery throws an error and no error was expected, fail the test
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				// If an error was expected and thrown, then make sure these assertions hold
				expect(err).to.be.instanceOf(Error);
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("ubc", oneCourse, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[invalid/tooMany.json] Too many results", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
	});

	describe("listDatasets", function () {
		const oneCourseDataset: InsightDataset = {
			id: "oneCourse",
			kind: InsightDatasetKind.Sections,
			numRows: 3,
		};

		beforeEach(function () {
			facade = new InsightFacade();
		});

		afterEach(async function () {
			await clearDisk();
		});

		//nothing added, so empty array returned
		it("should return empty array", async function () {
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([]);
		});

		//one thing added, so one element returned in array which matches the one that was added
		it("should return one element in array", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
			} catch {
				expect.fail("Should not have thrown!");
			}
			const result = await facade.listDatasets();
			//const godPlease: InsightDataset[] = [oneCourseDataset];

			expect(result[0].id).to.equal("oneCourse");
			expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
			expect(result[0].numRows).to.equal(oneCourseDataset.numRows);

			//return expect(result).to.deep.equal(godPlease);
		});

		//three datasets added, three removed, empty array returned
		it("should return empty array after removing all", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				await facade.removeDataset("oneCourse");
				await facade.removeDataset("anotherOneCourse");
				await facade.removeDataset("threeCourses");
			} catch {
				expect.fail("Should not have thrown!");
			}
			const result = await facade.listDatasets();
			return expect(result).to.deep.equal([]);
		});
	});
});
