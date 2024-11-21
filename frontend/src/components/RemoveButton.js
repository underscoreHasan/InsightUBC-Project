import React from "react";
import { Button } from "@chakra-ui/react";
import axios from "axios";

function RemoveButton() {

	const handleRemove = async () => {
		const datasetId = prompt("Enter the ID of the dataset to remove:");

		if (!datasetId) {
			alert("Dataset ID is required to remove a dataset.");
			return;
		}

		try {
			const response = await axios.delete(`http://localhost:4321/dataset/${datasetId}`);

			if (response.status === 200) {
				alert(`Dataset removed successfully. Response: ${response.data.result}`);
			}
		} catch (error) {
			const errorMsg = error.response?.data?.error || error.message;

			if (error.response?.status === 404) {
				alert(`Dataset not found. Error: ${errorMsg}`);
			} else if (error.response?.status === 400) {
				alert(`Insight error occurred. Error: ${errorMsg}`);
			} else {
				alert(`Unexpected error occurred. Error: ${errorMsg}`);
			}
		}
	};

	return (
		<Button colorScheme="red" onClick={handleRemove}>
			Remove Dataset
		</Button>
	);
}

export default RemoveButton;
