import React, { useState, useEffect } from "react";
import logo from "./assets/ubc-logo.jpg";
import "./App.css";
import { Provider } from "./components/ui/provider";
import { VStack, Image, Button, Text } from "@chakra-ui/react";
import AddButton from "./components/AddButton";
import RemoveButton from "./components/RemoveButton";
import ListButton from "./components/ListButton";
import InsightsButton from "./components/InsightsButton";
import axios from "axios";

function App() {
	const [showOptionsMenu, setShowOptionsMenu] = useState(false);
	const [datasetIds, setDatasetIds] = useState([]); // State for dataset IDs

	// Fetch datasets when options menu is shown
	useEffect(() => {
		if (showOptionsMenu) {
			fetchDatasets();
		}
	}, [showOptionsMenu]);

	// Function to fetch datasets from the server
	const fetchDatasets = async () => {
		try {
			const response = await axios.get("http://localhost:4321/datasets");
			if (response.status === 200) {
				const datasets = response.data.result || [];
				const ids = datasets.map((dataset) => dataset.id);
				setDatasetIds(ids); // Update dataset IDs in state
			}
		} catch (error) {
			console.error("Error fetching datasets:", error);
			setDatasetIds([]);
		}
	};

	return (
		<Provider>
			<BackButton onClick={() => setShowOptionsMenu(false)} />
			<VStack>
				{!showOptionsMenu ? (
					<>
						<Image src={logo} alt="UBC Logo" />
						<Button onClick={() => setShowOptionsMenu(true)}>
							Sections Insight
						</Button>
					</>
				) : (
					<OptionsMenu
						datasetIds={datasetIds}
						fetchDatasets={fetchDatasets}
					/>
				)}
			</VStack>
		</Provider>
	);
}

function OptionsMenu({ datasetIds, fetchDatasets }) {
	return (
		<>
			<Text fontSize="md" fontWeight="bold">
				Available Datasets: {datasetIds.join(", ") || "None"}
			</Text>
			<AddButton fetchDatasets={fetchDatasets} />
			<RemoveButton fetchDatasets={fetchDatasets} />
			<ListButton fetchDatasets={fetchDatasets} />
			<InsightsButton datasetIds={datasetIds} />
		</>
	);
}

function BackButton({ onClick }) {
	return (
		<Button
			position="absolute"
			top={4}
			left={4}
			onClick={onClick}
		>
			Go Back
		</Button>
	);
}

export default App;
