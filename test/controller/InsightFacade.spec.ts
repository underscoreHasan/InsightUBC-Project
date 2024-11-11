import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
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
	order: boolean;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare sections datasets used in tests.
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
	let oneCourseOneInvalidSection: string;

	// Declare rooms datasets used in tests.
	let campus: string;
	let campusIndexNoCampusFolder: string;
	let campusNoIndexNoCampusFolder: string;
	let campusNoIndexCampusFolder: string;
	let CHEMOnly: string;
	let CHEMOnlyCHEMhtmdeleted: string;
	let indexTbodyMissing: string;
	let indexTableMissing: string;
	let indexNoTDElements: string;
	let indexPointsToDirectory: string;
	let emptyRoomsFile: string;
	let nonIntuitiveButValid: string;

	// let noValidSections: string;

	before(async function () {
		// This block runs once and loads the sections datasets.
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
		oneCourseOneInvalidSection = await getContentFromArchives("oneCourseOneInvalidSection.zip");

		// This block runs once and loads the rooms datasets.
		campus = await getContentFromArchives("campus.zip");
		campusIndexNoCampusFolder = await getContentFromArchives("campusIndexNoCampusFolder.zip");
		campusNoIndexNoCampusFolder = await getContentFromArchives("campusNoIndexNoCampusFolder.zip");
		campusNoIndexCampusFolder = await getContentFromArchives("campusNoIndexCampusFolder.zip");
		CHEMOnly = await getContentFromArchives("CHEMOnly.zip");
		CHEMOnlyCHEMhtmdeleted = await getContentFromArchives("CHEMOnlyCHEMhtmdeleted.zip");
		indexTbodyMissing = await getContentFromArchives("indexTbodyMissing.zip");
		indexTableMissing = await getContentFromArchives("indexTableMissing.zip");
		indexNoTDElements = await getContentFromArchives("indexNoTDElements.zip");
		indexPointsToDirectory = await getContentFromArchives("indexPointsToDirectory.zip");
		emptyRoomsFile = await getContentFromArchives("emptyRoomsFile.zip");
		nonIntuitiveButValid = await getContentFromArchives("nonIntuitiveButValid.zip");
		// campus = await getContentFromArchives("/rooms/campus.zip");

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

		it("should add with caching", async () => {
			try {
				await facade.addDataset("data", oneCourse, InsightDatasetKind.Sections);
			} catch {
				expect.fail("Shouldnt get here");
			}
			const facade2 = new InsightFacade();
			try {
				await facade2.addDataset("data", oneCourse, InsightDatasetKind.Sections);
			} catch (error) {
				expect(error).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with  an empty dataset id", function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an underscore in the id", async () => {
			try {
				await facade.addDataset("_test", sections, InsightDatasetKind.Sections);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			return expect.fail("Error shouldve been thrown");
		});

		it("should reject when id is already in the dataset", async () => {
			try {
				await facade.addDataset("existingData", oneCourse, InsightDatasetKind.Sections);
			} catch {
				return expect.fail("Err shouldnt have been thrown");
			}
			try {
				await facade.addDataset("existingData", oneCourse, InsightDatasetKind.Sections);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			return expect.fail("Err should have been thrown");
		});

		it("should sucessfully add dataset", async () => {
			let result: string[];
			try {
				result = await facade.addDataset("data", oneCourse, InsightDatasetKind.Sections);
			} catch {
				return expect.fail("No error should be thrown");
			}
			return expect(result).to.have.members(["data"]);
		});

		it("should successfully add multiple datasets", async () => {
			let result: string[];

			try {
				result = await facade.addDataset("data", oneCourse, InsightDatasetKind.Sections);
				result = await facade.addDataset("data2", oneCourse, InsightDatasetKind.Sections);
			} catch {
				expect.fail("No error should be thrown");
			}
			expect(result).to.have.members(["data", "data2"]);
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

		it("should reject with a non-zip file for sections", async function () {
			try {
				await facade.addDataset("notazip", notGonnaWork, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a non-zip file for rooms", async function () {
			try {
				await facade.addDataset("notazip", notGonnaWork, InsightDatasetKind.Rooms);
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

		it("should reject when noValidSections", async function () {
			try {
				await facade.addDataset("noValidSections", noValidSections, InsightDatasetKind.Sections);
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

		// it("should resolve in time with large pair.zip", async function () {
		// 	try {
		// 		const result = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
		// 		expect(result).to.deep.equals(["sections"]);
		// 	} catch {
		// 		expect.fail("Should not have thrown after 1 addition!");
		// 	}
		// });

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

		it("should resolve in time with oneCourse.zip and oneCourseOneInvalidSection.zip", async function () {
			try {
				const result = await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				expect(result).to.deep.equals(["oneCourse"]);
			} catch {
				expect.fail("Should not have thrown after 1 addition!");
			}

			try {
				const result = await facade.addDataset(
					"oneCourseOneInvalidSection",
					oneCourseOneInvalidSection,
					InsightDatasetKind.Sections
				);
				expect(result).to.deep.equals(["oneCourse", "oneCourseOneInvalidSection"]);
			} catch {
				expect.fail("Should not have thrown after 2 additions!");
			}
		});

		//tests for Room
		// it("should resolve if campus.zip", async function () {
		// 	this.timeout(10000);
		// 	try {
		// 		const result = await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
		// 		expect(result).to.deep.equals(["campus"]);
		// 	} catch {
		// 		expect.fail("Should not have thrown after addition!");
		// 	}
		// });

		it("should reject if index.htm present but no campus folder", async function () {
			try {
				await facade.addDataset("campusIndexNoCampusFolder", campusIndexNoCampusFolder, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if no index.htm but campus folder present", async function () {
			try {
				await facade.addDataset("campusNoIndexCampusFolder", campusNoIndexCampusFolder, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if no index.htm and no campus folder", async function () {
			try {
				await facade.addDataset("campusNoIndexNoCampusFolder", campusNoIndexNoCampusFolder, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should resolve if CHEMOnly.zip", async function () {
			try {
				const result = await facade.addDataset("CHEMOnly", CHEMOnly, InsightDatasetKind.Rooms);
				expect(result).to.deep.equals(["CHEMOnly"]);
			} catch {
				expect.fail("Should not have thrown after addition!");
			}
		});

		it("should reject if no valid rooms", async function () {
			try {
				await facade.addDataset("CHEMOnlyCHEMhtmdeleted", CHEMOnlyCHEMhtmdeleted, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown after addition!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if no table body in index", async function () {
			try {
				await facade.addDataset("indexTbodyMissing", indexTbodyMissing, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown after addition!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if no table in index", async function () {
			try {
				await facade.addDataset("indexTableMissing", indexTableMissing, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown after addition!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if no TD elements in index", async function () {
			try {
				await facade.addDataset("indexNoTDElements", indexNoTDElements, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown after addition!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if index points to directory instead of file", async function () {
			try {
				await facade.addDataset("indexPointsToDirectory", indexPointsToDirectory, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown after addition!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if index points to empty rooms file", async function () {
			try {
				await facade.addDataset("emptyRoomsFile", emptyRoomsFile, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown after addition!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		//TODO: dont think the logic to add non-intuitive values here is working
		it("should resolve if rooms td elements have non intuitive but valid values", async function () {
			try {
				const result = await facade.addDataset("nonIntuitiveButValid", nonIntuitiveButValid, InsightDatasetKind.Rooms);
				expect(result).to.deep.equals(["nonIntuitiveButValid"]);
			} catch {
				expect.fail("Should not have thrown after addition!");
			}
		});

		it("should reject if CHEMOnly.zip provided with sections kind", async function () {
			try {
				await facade.addDataset("emptyRoomsFile", emptyRoomsFile, InsightDatasetKind.Sections);
				expect.fail("Should have thrown after addition!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if oneCourse.zip provided with rooms kind", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown after addition!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
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

		it("should remove with caching", async () => {
			try {
				await facade.addDataset("data", oneCourse, InsightDatasetKind.Sections);
			} catch {
				return expect.fail("Shouldnt get here");
			}
			const facade2 = new InsightFacade();
			try {
				await facade2.removeDataset("data");
			} catch {
				return expect.fail("Should still be able to remove");
			}
			expect((await facade2.listDatasets()).length).to.equal(0);
		});

		it("should not return if case sensitive", async () => {
			try {
				await facade.addDataset("data", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.removeDataset("DATA");
			} catch (error) {
				return expect(error).to.be.instanceOf(NotFoundError);
			}
			return expect.fail("should have caught error");
		});

		it("should reject if id has underscore", async () => {
			try {
				await facade.removeDataset("_");
			} catch (error) {
				return expect(error).to.be.instanceOf(InsightError);
			}
			return expect.fail("Should have caught error");
		});

		it("should reject if id is only whitespaces", async () => {
			try {
				await facade.removeDataset("");
			} catch (error) {
				return expect(error).to.be.instanceOf(InsightError);
			}
			return expect.fail("Should have caught error");
		});

		it("should reject if dataset is not found", async () => {
			try {
				await facade.removeDataset("not existing");
			} catch (error) {
				return expect(error).to.be.instanceOf(NotFoundError);
			}
			return expect.fail("Should have caught error");
		});

		it("should reject when trying to delete twice", async () => {
			await facade.addDataset("existing", oneCourse, InsightDatasetKind.Sections);

			try {
				await facade.removeDataset("existing");
			} catch {
				return expect.fail("should have not caught error");
			}

			try {
				await facade.removeDataset("existing");
			} catch (error) {
				return expect(error).to.be.instanceOf(NotFoundError);
			}
			return expect.fail("Should have caught error");
		});

		it("should delete data correctly", async () => {
			try {
				await facade.addDataset("data", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.removeDataset("data");
			} catch {
				return expect.fail("Shouldnt throw an error");
			}
			const datasets = await facade.listDatasets();
			expect(datasets.length).to.equal(0);
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

		it("should resolve for removal of rooms", async function () {
			try {
				await facade.addDataset("chemOnly", CHEMOnly, InsightDatasetKind.Rooms);
				const result = await facade.removeDataset("chemOnly");
				expect(result).to.deep.equals("chemOnly");
			} catch {
				expect.fail("Should not have thrown!");
			}
		});

		it("should resolve for removal of several rooms", async function () {
			try {
				await facade.addDataset("chemOnly", CHEMOnly, InsightDatasetKind.Rooms);
				await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
				const result = await facade.removeDataset("chemOnly");
				expect(result).to.deep.equals("chemOnly");
				const result2 = await facade.removeDataset("campus");
				expect(result2).to.deep.equals("campus");
			} catch {
				expect.fail("Should not have thrown!");
			}
		});
	});

	describe("Validate PerformQuery", function () {
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
			const { input, expected, errorExpected, order } = await loadTestQuery(this.test.title);
			let result: InsightResult[] | undefined;
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					return expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected === "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				}
				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}
			if (order) {
				expect(result).to.deep.equal(expected);
			} else {
				expect(result).to.have.deep.members(expected);
			}
		}
		describe("Perform query tests for sections", () => {
			before(async function () {
				facade = new InsightFacade();

				// Add the datasets to InsightFacade once.
				// Will *fail* if there is a problem reading ANY dataset.
				const loadDatasetPromises: Promise<string[]>[] = [
					facade.addDataset("sections", sections, InsightDatasetKind.Sections),
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
			it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
			it("[invalid/invalid.json] Query missing WHERE", checkQuery);
			it("[invalid/invalidWildcard.json] Query with invalid wildcard", checkQuery);
			it("[valid/empty.json] SELECT dept WHERE dept = empty", checkQuery);
			it("[valid/nursing.json] SELECT dept WHERE dept = nursing", checkQuery);
			it("[valid/wildcard.json] SELECT dept where dept IS z*", checkQuery);
			it("[invalid/invalidSize.json] Query result too large", checkQuery);
			it("[valid/whereoris.json] SELECT WHERE OR AND IS", checkQuery);
			it("[invalid/wildcardWrong.json] wrong wildcard only", checkQuery);
			it("[invalid/invalidOrder.json] invalid order key", checkQuery);
			it("[invalid/invalidTypeNumber.json] invalid type returning", checkQuery);
			it("[invalid/invalidTypeString.json] invalid string returning", checkQuery);
			it("[invalid/invalidArray.json] invalid columns", checkQuery);
			it("[invalid/invalidSingleDataset.json] invalid single dataset", checkQuery);
			it("[valid/queryFirstWildcard.json] query with wildcard first", checkQuery);
			it("[valid/wildcardEncased.json] query with wildcard encased", checkQuery);
			it("[valid/queryNegation.json] querying with a negation", checkQuery);
			it("[invalid/invalidMissingInput.json] missing input", checkQuery);
			it("[invalid/invalidMultiple.json]", checkQuery);
			it("[invalid/invalidHalfEmpty.json] missing input", checkQuery);
			it("[invalid/invalidDatasetNotAdded.json] missing dataset", checkQuery);
			it("[invalid/invalidOrderNotInColumns.json] missing order key", checkQuery);
			it("[invalid/invalidKey.json] invalid key", checkQuery);
			it("[invalid/invalidMultipleKeys.json] invalid multiple keys", checkQuery);
			it("[invalid/invalidLogicKey.json] invalid logic key", checkQuery);
			it("[invalid/invalidColumnsKey.json] invalid column key", checkQuery);
			it("[invalid/invalidDatasetName.json] invalid dataset name", checkQuery);
			it("[valid/orandnotis.json] valid query with OR AND NOT IS", checkQuery);
			it("[valid/tripleand.json] valid query with triple and", checkQuery);
			it("[valid/tripleor.json] valid query with triple or", checkQuery);
			it("[invalid/invalidId.json] invalid id", checkQuery);
			it("[valid/eq.json] query eq grade", checkQuery);
			it("[valid/gT.json] query gt grade", checkQuery);
			it("[valid/lt.json] query less than grade", checkQuery);
			it("[valid/zeroresult.json] zero results", checkQuery);
			it("[invalid/invalidNokeyNot.json] no keys for negation", checkQuery);
			it("[valid/wildcardstart.json] query with wildcard starting", checkQuery);
			it("[invalid/invalidIsKeyType.json] invalid string in IS", checkQuery);
			it("[invalid/invalidNumberType.json] invalid type in number query", checkQuery);
			it("[valid/allColumns2.json] column check 2", checkQuery);
			it("[valid/allColumns.json] column check", checkQuery);
			it("[valid/testSort.json] testing sorting", checkQuery);
			it("[valid/megaTest.json] mega test sort", checkQuery);
			it("[valid/noOrder.json] no order", checkQuery);
			it("[valid/testOrderSort.json] valid ordering", checkQuery);
			it("[valid/testMulti2KeySort.json] multi key sort", checkQuery);
			it("[valid/testMulti5KeySort.json] 5 multi keys", checkQuery);
			describe("transformations in sections", () => {
				it("[invalid/invalidKeyInColumnMustBeInGroupOrApply.json] invalid missing key from colums", checkQuery);
				it("[invalid/invalidKeyInGroup.json] invalid key in group", checkQuery);
				it("[invalid/invalidDatasetInApplyField.json] invalid dataset in apply", checkQuery);
				it("[invalid/invalidKeyInApplyField.json] invalid key in apply field", checkQuery);
				it("[invalid/invalidKeyTypeForApply.json] invalid key type for apply", checkQuery);
				it("[invalid/invalidTransformationInvalidKeyInApply.json] invalid key type for apply", checkQuery);
				it("[invalid/invalidTransformationMissingApply.json] invalid key type for apply", checkQuery);
				it("[invalid/invalidTransformationMissingGroup.json] invalid key type for apply", checkQuery);
				it("[invalid/invalidTransformationMissingKeyInColumns.json] invalid key type for apply", checkQuery);
				it("[invalid/invalidEmptyGroupArray.json] invalid group array", checkQuery);
				it("[invalid/invalidTypeForApply.json] invalid type for apply", checkQuery);
				it("[valid/validSectionsTransformation.json] valid section transformations", checkQuery);
				it("[valid/validSectionsDoubleGroup.json] valid double group key transformation", checkQuery);
				it("[invalid/invalidSectionsDoubleApplyFieldType.json] invalid apply field type", checkQuery);
				it("[invalid/invalidDuplicateKeyInApply.json] invalid duplicate apply key", checkQuery);
				it("[valid/validMaxSections.json] valid max sections", checkQuery);
				it("[valid/validMinSections.json] valid min section", checkQuery);
				it("[valid/testMultiSort.json] testing multi sort keys", checkQuery);
				it("[valid/testCount.json] testing count", checkQuery);
			});
		});
		describe("Perform query tests for rooms", () => {
			before(async function () {
				facade = new InsightFacade();

				// Add the datasets to InsightFacade once.
				// Will *fail* if there is a problem reading ANY dataset.
				const loadDatasetPromises: Promise<string[]>[] = [facade.addDataset("rooms", campus, InsightDatasetKind.Rooms)];

				try {
					await Promise.all(loadDatasetPromises);
				} catch (err) {
					throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
				}
			});

			after(async function () {
				await clearDisk();
			});

			// rooms
			it("[invalid/emptykeys.json] no keys in keys array for order", checkQuery);
			it("[invalid/invalidkeys.json] invalid keys in key array", checkQuery);
			it("[invalid/invalidOrderDir.json] invalid directions in order", checkQuery);
			it("[invalid/missingKeys.json] missing keys in order", checkQuery);
			it("[invalid/morethanonedatasetcolumns.json] column has more than one dataset", checkQuery);
			it("[invalid/invalidgroup.json] invalid group name", checkQuery);

			it("[valid/validNoTransformRooms.json] no transform rooms", checkQuery);
			it("[valid/rooms.json] default rooms test", checkQuery);
			it("[valid/validnokeys.json] no keys in order", checkQuery);

			// check ordering
			it("[valid/validAvg.json] valid avg and check order", checkQuery);
			it("[valid/validCount.json] valid count and check order", checkQuery);
			it("[valid/validmax.json] valid max and check order", checkQuery);
			it("[valid/validmin.json] valid min and check order", checkQuery);
			it("[valid/validsum.json] valid sum and check order", checkQuery);
			it("[valid/tiebreakMin.json] tiebreaking min", checkQuery);
			it("[valid/tiebreakMax.json] tiebreaking max", checkQuery);
			//invalid rooms
			it("[invalid/invalidKeyTypeForApply.json] invalid key type for apply", checkQuery);
			it("[invalid/invalidTransformationInvalidKeyInApply.json] invalid key type for apply", checkQuery);
			it("[invalid/invalidTransformationMissingApply.json] invalid key type for apply", checkQuery);
			it("[invalid/invalidTransformationMissingGroup.json] invalid key type for apply", checkQuery);
			it("[invalid/invalidTransformationMissingKeyInColumns.json] invalid key type for apply", checkQuery);
			it("[invalid/invalidEmptyGroupArray.json] invalid group array", checkQuery);
			it("[invalid/invalidTypeForApply.json] invalid type for apply", checkQuery);
		});
	});

	describe("listDatasets", function () {
		const oneCourseDataset: InsightDataset = {
			id: "oneCourse",
			kind: InsightDatasetKind.Sections,
			numRows: 3,
		};
		const chemOnlyDataset: InsightDataset = {
			id: "chemONLY",
			kind: InsightDatasetKind.Rooms,
			numRows: 6,
		};

		beforeEach(function () {
			facade = new InsightFacade();
		});

		afterEach(async function () {
			await clearDisk();
		});

		it("Should list data after caching sections", async () => {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
			} catch {
				expect.fail("Shouldnt get here");
			}

			const facade2 = new InsightFacade();

			const result = await facade2.listDatasets();
			expect(result.length).to.equal(1);
		});

		it("Should list data after caching rooms", async () => {
			try {
				await facade.addDataset("chemONLY", CHEMOnly, InsightDatasetKind.Rooms);
			} catch {
				expect.fail("Shouldnt get here");
			}

			const facade2 = new InsightFacade();

			const result = await facade2.listDatasets();
			expect(result.length).to.equal(1);
		});

		it("Should list empty data", async () => {
			const result = await facade.listDatasets();
			expect(result.length).to.equal(0);
		});

		it("Should list some data", async () => {
			await facade.addDataset("data", oneCourse, InsightDatasetKind.Sections);
			const result = await facade.listDatasets();
			expect(result.length).to.equal(1);
		});

		it("Should list two data", async () => {
			const expectedLength = 2;
			await facade.addDataset("data", oneCourse, InsightDatasetKind.Sections);
			await facade.addDataset("data2", oneCourse, InsightDatasetKind.Sections);
			const result = await facade.listDatasets();
			expect(result.length).to.equal(expectedLength);
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

			expect(result[0].id).to.equal("oneCourse");
			expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
			expect(result[0].numRows).to.equal(oneCourseDataset.numRows);
		});

		it("should return one room dataset in array", async function () {
			try {
				await facade.addDataset("chemOnly", CHEMOnly, InsightDatasetKind.Rooms);
			} catch {
				expect.fail("Should not have thrown!");
			}
			const result = await facade.listDatasets();

			expect(result[0].id).to.equal("chemOnly");
			expect(result[0].kind).to.equal(InsightDatasetKind.Rooms);
			expect(result[0].numRows).to.equal(chemOnlyDataset.numRows);
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

		it("should return empty array after removing all mixing kinds", async function () {
			try {
				await facade.addDataset("oneCourse", oneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("anotherOneCourse", anotherOneCourse, InsightDatasetKind.Sections);
				await facade.addDataset("threeCourses", threeCourses, InsightDatasetKind.Sections);
				await facade.addDataset("chemONLY", CHEMOnly, InsightDatasetKind.Rooms);
				await facade.removeDataset("oneCourse");
				await facade.removeDataset("anotherOneCourse");
				await facade.removeDataset("threeCourses");
				await facade.removeDataset("chemONLY");
			} catch {
				expect.fail("Should not have thrown!");
			}
			const result = await facade.listDatasets();
			return expect(result).to.deep.equal([]);
		});
	});
});
