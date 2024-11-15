import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import { loadTestQuery } from "../TestUtil";
import { log } from "console";
describe.only("Facade C3", function () {
	const testPort = 5000;
	const testServer = new Server(testPort);

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
		const ENDPOINT_URL = "/dataset/:id/:kind";
		// Sample on how to format PUT requests
		it("PUT test for courses dataset", function () {
			const ZIP_FILE_DATA = "TBD";
			const id = "datasetID";
			const kind = "sections";
			ENDPOINT_URL.replace(":id", id).replace(":kind", kind);
			try {
				return request(SERVER_URL)
					.put(ENDPOINT_URL)
					.send(ZIP_FILE_DATA)
					.set("Content-Type", "application/x-zip-compressed")
					.then(function (res: Response) {
						Log.info("Request response:", res.status);
						expect(res.status).to.be.equal(StatusCodes.OK);
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
			const ZIP_FILE_DATA = "ERR";
			const id = "datasetID";
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
					})
					.catch(function (err) {
						// some logging here please!
						Log.error("Shouldn't get here:", err);
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
				// and some more logging here!
			}
		});
	});

	describe("DELETE delete dataset tests", () => {
		beforeEach(() => {
			const TEMP_URL = `http://localhost:${testPort}`;
			const TEMP_ENDPOINT = "/dataset/:id/:kind";
			// Sample on how to format PUT requests
			it("PUT test for courses dataset", function () {
				const ZIP_FILE_DATA = "TBD";
				const id = "datasetID";
				const kind = "sections";
				TEMP_ENDPOINT.replace(":id", id).replace(":kind", kind);
				try {
					return request(TEMP_URL)
						.put(TEMP_ENDPOINT)
						.send(ZIP_FILE_DATA)
						.set("Content-Type", "application/x-zip-compressed")
						.then(function (res: Response) {
							Log.info("Request response:", res.status);
							expect(res.status).to.be.equal(StatusCodes.OK);
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
		});

		const SERVER_URL = `http://localhost:${testPort}`;
		const ENDPOINT_URL = "/dataset/:id/";

		it("Delete valid dataset", () => {
			const id = "datasetID";
			ENDPOINT_URL.replace(":id", id);
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

		it("Delete dataset with insightError", () => {
			const id = "datasetID";
			ENDPOINT_URL.replace(":id", id);
			try {
				return request(SERVER_URL)
					.get(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info(res.text);
						expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
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
			const id = "datasetID";
			ENDPOINT_URL.replace(":id", id);
			try {
				return request(SERVER_URL)
					.get(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info(res.text);
						expect(res.status).to.be.equal(StatusCodes.NOT_FOUND);
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
		async function addData(): Promise<void> {
			const TEMP_URL = `http://localhost:${testPort}`;
			const TEMP_ENDPOINT = "/dataset/:id/:kind";
			// Sample on how to format PUT requests
			const ZIP_FILE_DATA = "TBD";
			const id = "datasetID";
			const kind = "sections";
			TEMP_ENDPOINT.replace(":id", id).replace(":kind", kind);
			try {
				return request(TEMP_URL)
					.put(TEMP_ENDPOINT)
					.send(ZIP_FILE_DATA)
					.set("Content-Type", "application/x-zip-compressed")
					.then(function (res: Response) {
						Log.info("Request response:", res.status);
						expect(res.status).to.be.equal(StatusCodes.OK);
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
		}
		const SERVER_URL = `http://localhost:${testPort}`;
		const ENDPOINT_URL = "/query";

		it("Valid query on added dataset", async () => {
			const sampleQuery = await loadTestQuery("[valid/simple.json]");
			const input: any = sampleQuery.input;
			await addData();
			try {
				return request(SERVER_URL)
					.post(ENDPOINT_URL)
					.send(input)
					.set("Content-Type", "application/json")
					.then((res: Response) => {
						Log.info("Request status:", res.status);
						expect(res.status).to.be.equal(StatusCodes.OK);
					})
					.catch(() => {
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
			}
		});
		it("Valid query with stop and start server", async () => {
			try {
				await testServer.stop();
				await testServer.start();
			} catch (err) {
				Log.error("error", err);
			}

			const sampleQuery = await loadTestQuery("[valid/simple.json]");
			const input: any = sampleQuery.input;
			try {
				return request(SERVER_URL)
					.post(ENDPOINT_URL)
					.send(input)
					.set("Content-Type", "application/json")
					.then((res: Response) => {
						Log.info("Request status:", res.status);
						expect(res.status).to.be.equal(StatusCodes.OK);
					})
					.catch(() => {
						expect.fail();
					});
			} catch (err) {
				Log.error(err);
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
		const SERVER_URL = `http://localhost:${testPort}`;
		const ENDPOINT_URL = "/datasets";
		it("GET dataset", () => {
			try {
				return request(SERVER_URL)
					.get(ENDPOINT_URL)
					.then((res: Response) => {
						Log.info("Request status", res.status);
						expect(res.status).to.be.equal(StatusCodes.OK);
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
