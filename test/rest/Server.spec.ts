import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import { clearDisk, loadTestQuery } from "../TestUtil";
import fs from "fs";
import path from "path";

describe("Facade C3", function () {
	let rawOneCourseData: Buffer;
	const testPort = 5000;
	const testServer = new Server(testPort);

	async function putDataset(id: any, kind: any, fileName: any, port = testPort): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.readFile(path.resolve(__dirname, `../resources/archives/${fileName}`), (err, res) => {
				if (err) {
					return reject(new Error("Error reading data: " + err));
				}

				rawOneCourseData = res;
				const SERVER_URL = `http://localhost:${port}`;
				let ENDPOINT_URL = "/dataset/:id/:kind";
				ENDPOINT_URL = ENDPOINT_URL.replace(":id", id).replace(":kind", kind);

				Log.info("Starting to add dataset");

				request(SERVER_URL)
					.put(ENDPOINT_URL)
					.send(rawOneCourseData)
					.set("Content-Type", "application/x-zip-compressed")
					.then(() => {
						Log.info("Added dataset");
						resolve();
					})
					.catch((error) => {
						Log.error(error);
						reject(error);
					});
			});
		});
	}

	async function deleteDataset(id: any): Promise<void> {
		return new Promise((resolve, reject) => {
			const SERVER_URL = `http://localhost:${testPort}`;
			let ENDPOINT_URL = "/dataset/:id";
			ENDPOINT_URL = ENDPOINT_URL.replace(":id", id);
			Log.info(ENDPOINT_URL);
			try {
				return request(SERVER_URL)
					.delete(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info("Response", res.body);
						expect(res.status).to.be.equal(StatusCodes.OK);
						expect(res.body.result).to.be.equal(id);
						resolve();
					})
					.catch(function (err) {
						Log.error(err);
						expect.fail();
						reject();
					});
			} catch (err) {
				Log.error(err);
			}
		});
	}

	before(async function () {
		// TODO: start server here once and handle errors properly

		try {
			await testServer.start();
		} catch (err) {
			Log.error(err);
		}
	});

	after(async function () {
		try {
			await testServer.stop();
		} catch (error) {
			Log.error(error);
		}

		// TODO: stop server here once!
	});

	beforeEach(function () {
		Log.info("Starting new request");
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		Log.info("Request finished");
		// might want to add some process logging here to keep track of what is going on
	});

	it("GET echo sanity test", function () {
		const SERVER_URL = `http://localhost:${testPort}`;
		const ENDPOINT_URL = "/echo/:hello";

		try {
			return request(SERVER_URL)
				.get(ENDPOINT_URL)
				.then((res: Response) => {
					Log.info(res.text);
					expect(res.status).to.be.equal(StatusCodes.OK);
				})
				.catch(function (err) {
					Log.error(err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	describe("PUT tests", () => {
		const SERVER_URL = `http://localhost:${testPort}`;
		let ENDPOINT_URL = "/dataset/:id/:kind";
		before((done) => {
			fs.readFile(path.resolve(__dirname, "../resources/archives/AnotherOneCourse.zip"), (err, res) => {
				if (err) {
					throw new Error("Error reading data" + err);
				}
				rawOneCourseData = res;
				done();
			});
		});
		afterEach(async () => {
			await clearDisk();
		});
		// Sample on how to format PUT requests
		it("PUT test for courses dataset", function () {
			const ZIP_FILE_DATA = rawOneCourseData;
			const id = "datasetID";
			const kind = "sections";
			ENDPOINT_URL = ENDPOINT_URL.replace(":id", id).replace(":kind", kind);
			try {
				return request(SERVER_URL)
					.put(ENDPOINT_URL)
					.send(ZIP_FILE_DATA)
					.set("Content-Type", "application/x-zip-compressed")
					.then(async function (res: Response) {
						Log.info("Request response:", res.status);

						expect(res.status).to.be.equal(StatusCodes.OK);
						expect(res.body.result).to.have.members([id]);
						await deleteDataset(id);
					})
					.catch(function (err) {
						// some logging here please!
						Log.error(err);
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
				// and some more logging here!
			}
		});

		it("PUT test with invalid zip", () => {
			const ZIP_FILE_DATA = undefined;
			const id = "invalidID";
			const kind = "sections";
			ENDPOINT_URL.replace(":id", id).replace(":kind", kind);
			try {
				return request(SERVER_URL)
					.put(ENDPOINT_URL)
					.send(ZIP_FILE_DATA)
					.set("Content-Type", "application/x-zip-compressed")
					.then(function (res: Response) {
						Log.info("Request response:", res.status);
						expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
						expect(res.body).to.deep.equal({
							error: "Error with fn",
						});
					})
					.catch(function (err) {
						Log.error("Shouldn't get here:" + err);
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
				// and some more logging here!
			}
		});
	});

	describe("DELETE  dataset tests", () => {
		const id = "deleteID";
		let ENDPOINT_URL = "/dataset/:id";
		const SERVER_URL = `http://localhost:${testPort}`;

		beforeEach(async () => {
			await putDataset(id, "sections", "AnotherOneCourse.zip");
			ENDPOINT_URL = "/dataset/:id";
		});

		afterEach(async () => {
			await clearDisk();
		});

		after(async () => {
			await deleteDataset(id);
		});

		it("Delete valid dataset", () => {
			ENDPOINT_URL = ENDPOINT_URL.replace(":id", id);
			Log.info(ENDPOINT_URL);
			try {
				return request(SERVER_URL)
					.delete(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info("Response", res.body);
						expect(res.status).to.be.equal(StatusCodes.OK);
						expect(res.body.result).to.be.equal(id);
					})
					.catch(function (err) {
						Log.error(err);
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});

		it("Delete dataset with insightError", () => {
			const tempid = "___invalid__id";
			ENDPOINT_URL = ENDPOINT_URL.replace(":id", tempid);
			const expectedResult = { error: "error with fn" };
			try {
				return request(SERVER_URL)
					.delete(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info(res.body);
						expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
						expect(res.body).to.deep.equal(expectedResult);
					})
					.catch(function (err) {
						Log.error(err);
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});

		it("Delete dataset with notFoundError", () => {
			const tempid = "nonexistent";
			ENDPOINT_URL = ENDPOINT_URL.replace(":id", tempid);
			const expectedResult = { error: "not found dataset" };
			try {
				return request(SERVER_URL)
					.delete(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info(res.body);
						expect(res.status).to.be.equal(StatusCodes.NOT_FOUND);
						expect(res.body).to.deep.equal(expectedResult);
					})
					.catch(function (err) {
						Log.error(err);
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});
	});

	describe("POST post query tests", () => {
		const queryID = "sections";
		before(async () => {
			await putDataset(queryID, "sections", "pair.zip");
		});

		after(async () => {
			await clearDisk();
			await deleteDataset(queryID);
		});

		const SERVER_URL = `http://localhost:${testPort}`;
		const ENDPOINT_URL = "/query";

		it("Valid query on added dataset", async () => {
			const sampleQuery = await loadTestQuery("[valid/simple.json]");
			const input: any = sampleQuery.input;
			try {
				return request(SERVER_URL)
					.post(ENDPOINT_URL)
					.send(input)
					.set("Content-Type", "application/json")
					.then((res: Response) => {
						Log.info("Request status:", res.status);
						Log.info(res.body);
						expect(res.status).to.be.equal(StatusCodes.OK);
						expect(res.body.result).to.have.deep.members(sampleQuery.expected);
					})
					.catch((err) => {
						Log.error(err);
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});
		it("Valid query with sorting query", async () => {
			const sampleQuery = await loadTestQuery("[valid/testOrderSort.json]");
			const input: any = sampleQuery.input;
			try {
				return request(SERVER_URL)
					.post(ENDPOINT_URL)
					.send(input)
					.set("Content-Type", "application/json")
					.then((res: Response) => {
						Log.info("Request status:", res.status);
						expect(res.status).to.be.equal(StatusCodes.OK);
						expect(res.body.result).to.have.deep.members(sampleQuery.expected);
					})
					.catch(() => {
						expect.fail();
					});
			} catch (err) {
				Log.error("error", err);
			}
		});
		it("Invalid query", async () => {
			const sampleQuery = await loadTestQuery("[invalid/invalid.json]");
			const input: any = sampleQuery.input;
			try {
				return request(SERVER_URL)
					.post(ENDPOINT_URL)
					.send(input)
					.set("Content-Type", "application/json")
					.then((res: Response) => {
						Log.info("Request status:", res.status);
						expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
					})
					.catch(() => {
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});
	});
	describe("GET datasets", () => {
		before(async () => {
			await clearDisk();
		});
		afterEach(async () => {
			await clearDisk();
		});
		const SERVER_URL = `http://localhost:${testPort}`;
		const ENDPOINT_URL = "/datasets";
		it("GET dataset empty", async () => {
			try {
				return request(SERVER_URL)
					.get(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info("Request status", res.status);
						expect(res.status).to.be.equal(StatusCodes.OK);
						expect(res.body.result).to.deep.equal([]);
					})
					.catch(() => {
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});
		it("GET dataset", async () => {
			try {
				await putDataset("data1", "sections", "ThreeCourses.zip");
				return request(SERVER_URL)
					.get(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info("Request status", res.status);
						Log.info(res.body);

						expect(res.status).to.be.equal(StatusCodes.OK);
						expect(res.body.result.length).to.equal(1);
					})
					.catch(() => {
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});

		it("GET 2 dataset", async () => {
			const length = 2;
			try {
				await putDataset("data1", "sections", "ThreeCourses.zip");
				await putDataset("data2", "sections", "ThreeCourses.zip");

				return request(SERVER_URL)
					.get(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info("Request status", res.status);
						expect(res.status).to.be.equal(StatusCodes.OK);
						expect(res.body.result.length).to.equal(length);
					})
					.catch(() => {
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
