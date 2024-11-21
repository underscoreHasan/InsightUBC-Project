import React, { useState } from "react";
import { Button, Input, VStack, Text} from "@chakra-ui/react";
import axios from "axios";

function AddButton() {
    const [file, setFile] = useState(null);
    const [datasetName, setDatasetName] = useState("");

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleNameChange = (e) => {
        setDatasetName(e.target.value);
    };

    const handleSubmit = async () => {
        if (!file || !datasetName) {
            alert("Please provide both a file and a dataset name")
            return;
        }

        try {
            const response = await axios.put(
                `http://localhost:4321/dataset/${datasetName}/sections`,
                file, // Sending the file content raw as a buffer
                {
                    headers: {
                        "Content-Type": "application/octet-stream",
                    },
                }
            );

            if (response.status === 200) {
                alert(`Dataset uploaded successfully. Response: ${JSON.stringify(response.data.result)}`);
            }
        } catch (error) {
            alert(`Failed to upload dataset. Error: ${error.response?.data?.error || error.message}`);
        }
    };

    return (
        <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">Upload Dataset</Text>
            <Input
                type="file"
                onChange={handleFileChange}
                accept="application/json, text/csv, text/plain" // Adjust file types as needed
            />
            <Input
                placeholder="Enter dataset name"
                value={datasetName}
                onChange={handleNameChange}
            />
            <Button colorScheme="blue" onClick={handleSubmit}>
                Upload Dataset
            </Button>
        </VStack>
    );
}

export default AddButton;
