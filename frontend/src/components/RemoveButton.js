import React from "react";
import { Button } from "@chakra-ui/react";
import axios from "axios";

function RemoveButton({ fetchDatasets }) {
	const handleRemove = async () => {
		const datasetId = prompt("Enter the ID of the dataset to remove:");
		if (!datasetId) {
			alert("Dataset ID is required to remove a dataset.");
			return;
		}

		try {
			const response = await axios.delete(`http://localhost:4321/dataset/${datasetId}`);
			if (response.status === 200) {
				await fetchDatasets(); // Update dataset list
				alert("Dataset removed successfully.");
			}
		} catch (error) {
			alert(`Failed to remove dataset. Error: ${error.response?.data?.error || error.message}`);
		}
	};

	return (
		<Button colorScheme="red" onClick={handleRemove}>
			Remove Dataset
		</Button>
	);
}

export default RemoveButton;
