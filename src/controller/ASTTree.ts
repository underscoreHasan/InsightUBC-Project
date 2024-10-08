export const ValidFields = new Set([
	"uuid",
	"id",
	"title",
	"instructor",
	"dept",
	"year",
	"avg",
	"pass",
	"fail",
	"audit",
]);

const ValidComparators = new Set(["IS", "OR", "NOT", "AND", "LT", "GT", "EQ"]);

export class ASTTree {
	constructor(datasetID: string, query: any) {
		console.log(Object.keys(query));
		console.log(datasetID);
	}
}

class ASTNode {
	constructor() {}
}
