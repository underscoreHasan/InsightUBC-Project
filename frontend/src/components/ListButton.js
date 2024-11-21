import React from "react";
import { Button } from "@chakra-ui/react";
import axios from "axios";

function ListButton() {

	const handleList = async () => {
		try {
			const response = await axios.get("http://localhost:4321/datasets");

			if (response.status === 200) {
				const datasets = response.data.result || [];
				if (datasets.length === 0) {
					alert("No datasets available.");
				} else {
					const formattedList = datasets
						.map(
							(dataset) =>
								`ID: ${dataset.id}\nKind: ${dataset.kind}\nRows: ${dataset.numRows}`
						)
						.join("\n\n");
					alert(`Available Datasets:\n\n${formattedList}`);
				}
			}
		} catch (error) {
			alert(`Failed to fetch datasets. Error: ${error.response?.data?.error || error.message}`);
		}
	};

	return (
		<Button colorScheme="green" onClick={handleList}>
			List Datasets
		</Button>
	);
}

export default ListButton;
