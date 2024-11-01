import { InsightError } from "./IInsightFacade";
import { numericFields } from "./TransformationManipulations";

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
	"fullName",
	"shortSame",
	"number",
	"name",
	"address",
	"lat",
	"lon",
	"seats",
	"type",
	"furniture",
	"href",
]);

type LogicOperator = "AND" | "OR";
type ComparisionOperator = "LT" | "GT" | "EQ" | "IS";

interface BaseNode {
	operator: LogicOperator | ComparisionOperator | "NOT";
	evaluate(dataset: any): boolean;
}

interface LogicNode extends BaseNode {
	operator: LogicOperator;
	children: ASTNode[];
}

interface ComparisionNode extends BaseNode {
	operator: ComparisionOperator;
	field: string;
	value: string;
}

interface NegationNode extends BaseNode {
	operator: "NOT";
	child: ASTNode;
}

type ASTNode = LogicNode | ComparisionNode | NegationNode;

export class ASTTree {
	private root: ASTNode;

	constructor(query: any, datasetID: string) {
		this.root = this.buildASTTree(query, datasetID);
	}

	public evaluate(data: any): any {
		return this.root.evaluate(data);
	}

	private buildASTTree(query: string, datasetID: string): any {
		const [key, value] = Object.entries(query)[0];
		this.validateValue(value);

		if (key === "AND" || key === "OR") {
			if (!Array.isArray(value) || value.length === 0) {
				throw new InsightError("Must have children keys");
			}
			const logicalNode: LogicNode = {
				operator: key,
				children: value.map((child: any) => this.buildASTTree(child, datasetID)),
				evaluate: (data: any) => this.evaluateLogic(data, key, logicalNode.children),
			};
			return logicalNode;
		}

		if (key === "NOT") {
			const negationNode: NegationNode = {
				operator: key,
				child: this.buildASTTree(value, datasetID),
				evaluate: (data: any) => !this.evaluateNode(this.buildASTTree(value, datasetID), data),
			};
			return negationNode;
		}
		if (key === "IS" || key === "EQ" || key === "LT" || key === "GT") {
			this.checkMultipleDatasets(Object.keys(value)[0], datasetID);
			const [comparisionKey, comparisionValue] = Object.entries(value)[0];
			this.checkForTypeEquality(comparisionKey, comparisionValue, key);
			const comparisionNode: ComparisionNode = {
				operator: key as ComparisionOperator,
				field: comparisionKey,
				value: comparisionValue,
				evaluate: (data: any) => this.evaluateComparision(data, key, value),
			};
			return comparisionNode;
		}
	}

	private checkMultipleDatasets(treeField: any, datasetID: string): void {
		if (treeField.substring(0, treeField.indexOf("_")) !== datasetID) {
			throw new InsightError("multiple datasets found");
		}
	}

	private validateValue(value: string): void {
		if (value.length === 0) {
			throw new InsightError("No query found");
		}

		if (JSON.stringify(value) === "{}") {
			throw new InsightError("no keys");
		}
	}

	private evaluateNode(node: ASTNode, data: any): boolean {
		return node.evaluate(data);
	}

	private evaluateLogic(data: any, operator: LogicOperator, children: ASTNode[]): boolean {
		if (operator === "AND") {
			return children.every((child: ASTNode) => this.evaluateNode(child, data));
		} else if (operator === "OR") {
			return children.some((child) => this.evaluateNode(child, data));
		}
		throw new InsightError("Invalid logic operator");
	}

	private evaluateComparision(data: any, operator: string, value: string): any {
		const treeQuery = Object.entries(value)[0];
		const treeField = treeQuery[0];
		const treeValue = treeQuery[1];
		const treeKey = treeField.split("_")[1];
		switch (operator) {
			case "IS":
				return this.isMatchingType(data[treeKey], false) && this.matchesPattern(data[treeKey], treeValue);

			case "GT":
				return this.isMatchingType(data[treeKey]) && data[treeKey] > treeValue;

			case "LT":
				return this.isMatchingType(data[treeKey]) && data[treeKey] < treeValue;

			case "EQ":
				return this.isMatchingType(data[treeKey]) && data[treeKey] === treeValue;
		}
	}

	// if type = true then its an integer if not its a string
	private isMatchingType(input: string | number, type = true): boolean {
		if (typeof input === "number" && type) {
			return true;
		} else if (typeof input === "string" && !type) {
			return true;
		}
		return false;
	}

	private checkForTypeEquality(comparisionKey: string, comparisionValue: string | number, operator: string): void {
		const field = comparisionKey.substring(comparisionKey.indexOf("_") + 1);
		if (!numericFields.has(field)) {
			if (typeof comparisionValue === "number") {
				throw new InsightError("Mismatched type");
			}
		} else {
			if (typeof comparisionValue === "string") {
				throw new InsightError("Mismatched Error");
			}
		}
		if (operator === "IS" && typeof comparisionValue === "number") {
			throw new InsightError("Wrong key for IS");
		}
	}
	private matchesPattern(inputString: string, pattern: string): boolean {
		if (pattern.includes("*") && !pattern.startsWith("*") && !pattern.endsWith("*")) {
			throw new InsightError("Illegal wildcard.");
		}
		if (pattern.startsWith("*") && pattern.endsWith("*")) {
			const trimmedPattern = pattern.slice(1, -1);
			return inputString.includes(trimmedPattern);
		} else if (pattern.startsWith("*")) {
			const trimmedPattern = pattern.slice(1);
			return inputString.endsWith(trimmedPattern);
		} else if (pattern.endsWith("*")) {
			const trimmedPattern = pattern.slice(0, -1);
			return inputString.startsWith(trimmedPattern);
		} else {
			return inputString === pattern;
		}
	}

	// private printNode(node: any, depth = 0): void {
	// 	// Indent to represent depth of the node in the tree
	// 	const indent = " ".repeat(depth * 2);

	// 	// Print the current node
	// 	console.log(`${indent}Node Type: ${node.operator}`);

	// 	// Depending on the type of node, print relevant details
	// 	if ("children" in node && Array.isArray(node.children)) {
	// 		// For LogicNode (AND, OR), print children nodes
	// 		console.log(`${indent}Children:`);
	// 		node.children.forEach((child: any) => this.printNode(child, depth + 1));
	// 	} else if (node.operator === "NOT" && "child" in node) {
	// 		// For NegationNode (NOT), print child node
	// 		console.log(`${indent}Child:`);
	// 		this.printNode(node.child, depth + 1);
	// 	} else if ("field" in node) {
	// 		// For ComparisionNode (IS, LT, GT, EQ), print the comparison details
	// 		console.log(`${indent}Field: ${node.field}`);
	// 		console.log(`${indent}Value: ${node.value}`);
	// 		console.log(`${indent}function: ${node.evaluate}`);
	// 	}
	// }

	// public printTree(): void {
	// 	if (this.root) {
	// 		this.printNode(this.root);
	// 	} else {
	// 		console.log("Tree is empty.");
	// 	}
	// }
}
