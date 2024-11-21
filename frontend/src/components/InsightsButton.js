import React, { useState } from "react";
import { Button, VStack, Text } from "@chakra-ui/react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
	Chart as ChartJS,
	BarElement,
	CategoryScale,
	LinearScale,
	Title,
	Tooltip,
	Legend,
} from "chart.js";
import BuildQueries from "./Queries";

// Register Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

function InsightsButton({ datasetIds }) {
	const [chartDataArray, setChartDataArray] = useState([]); // State for multiple chart data
	const [loading, setLoading] = useState(false); // Loading state
	const [error, setError] = useState(null); // Error state

	const fetchInsights = async () => {
		setLoading(true);
		setError(null);
		setChartDataArray([]);

		try {
			const charts = await Promise.all(
				datasetIds.map(async (datasetId) => {
					const response = await axios.post(
						"http://localhost:4321/query",
						BuildQueries(datasetId),
						{ headers: { "Content-Type": "application/json" } }
					);

					if (response.status === 200 && response.data.result) {
						// Process the response to get the top 5 departments
						const sortedData = response.data.result
							.sort((a, b) => b.avg - a.avg) // Sort by avg descending
							.slice(0, 5); // Get top 5

						const departments = sortedData.map((item) => item[`${datasetId}_dept`]);
						const averages = sortedData.map((item) => item.avg);

						// Return chart data for this dataset
						return {
							datasetId,
							data: {
								labels: departments,
								datasets: [
									{
										label: `Average Scores (${datasetId})`,
										data: averages,
										backgroundColor: "rgba(75, 192, 192, 0.6)",
										borderColor: "rgba(75, 192, 192, 1)",
										borderWidth: 1,
									},
								],
							},
						};
					} else {
						throw new Error("Invalid response data");
					}
				})
			);

			setChartDataArray(charts);
		} catch (err) {
			setError(err.response?.data?.error || "Failed to fetch insights");
		} finally {
			setLoading(false);
		}
	};

	return (
		<VStack spacing={4} align="stretch">
			<Button colorScheme="teal" onClick={fetchInsights} isLoading={loading}>
				Dataset Insights
			</Button>
			{error && <Text color="red.500">{error}</Text>}
			{chartDataArray.map((chart, index) => (
				<VStack key={index} spacing={4} align="stretch">
					<Text fontWeight="bold">{`Dataset: ${chart.datasetId}`}</Text>
					<Bar
						data={chart.data}
						options={{
							responsive: true,
							plugins: {
								legend: {
									display: true,
									position: "top",
								},
								title: {
									display: true,
									text: `Top 5 Departments by Average Scores (${chart.datasetId})`,
								},
							},
						}}
					/>
				</VStack>
			))}
		</VStack>
	);
}

export default InsightsButton;
