import React, { useState } from "react";
import { Button, VStack, Text } from "@chakra-ui/react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
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
				datasetIds.flatMap(async (datasetId) => {
					const queries = BuildQueries(datasetId); // Exactly 3 distinct queries
					const chartTypes = ["Average Scores", "Failure Rates", "Department Summary"]; // Define chart types

					return Promise.all(
						queries.map(async (query, queryIndex) => {
							const response = await axios.post("http://localhost:4321/query", query, {
								headers: { "Content-Type": "application/json" },
							});

							if (response.status === 200 && response.data.result) {
								if (queryIndex === 2) {
									// Special logic for the last query (stacked bar chart)
									const departments = ["MATH", "CPSC", "STAT"]; // Fixed departments
									const passData = [];
									const failData = [];
									const auditData = [];

									// Process the response data
									departments.forEach((dept) => {
										// Find the department data in the response
										const deptData = response.data.result.find(
											(item) => item[`${datasetId}_dept`].toUpperCase() === dept
										);
										if (deptData) {
											passData.push(deptData.numPass || 0); // Default to 0 if field is missing
											failData.push(deptData.numFails || 0);
											auditData.push(deptData.numAudits || 0);
										} else {
											passData.push(0); // Ensure all departments are represented even if missing
											failData.push(0);
											auditData.push(0);
										}
									});

									// Return chart data for this query
									return {
										datasetId,
										queryType: chartTypes[queryIndex], // Use chart type label
										data: {
											labels: departments,
											datasets: [
												{
													label: "Pass",
													data: passData,
													backgroundColor: "rgba(75, 192, 192, 0.6)",
													borderColor: "rgba(75, 192, 192, 1)",
													borderWidth: 1,
												},
												{
													label: "Fail",
													data: failData,
													backgroundColor: "rgba(255, 99, 132, 0.6)",
													borderColor: "rgba(255, 99, 132, 1)",
													borderWidth: 1,
												},
												{
													label: "Audit",
													data: auditData,
													backgroundColor: "rgba(54, 162, 235, 0.6)",
													borderColor: "rgba(54, 162, 235, 1)",
													borderWidth: 1,
												},
											],
										},
										options: {
											responsive: true,
											plugins: {
												legend: {
													display: true,
													position: "top",
												},
												title: {
													display: true,
													text: `Department Summary (Pass/Fail/Audit, ${datasetId})`,
												},
											},
											scales: {
												x: {
													stacked: true,
												},
												y: {
													stacked: true,
												},
											},
										},
									};
								} else {
									// Logic for other queries (e.g., averages or failures)
									const sortedData = response.data.result
										.sort((a, b) => b.avg - a.avg) // Sort by avg descending
										.slice(0, 5); // Get top 5

									const departments = sortedData.map((item) => item[`${datasetId}_dept`]);
									const values =
										queryIndex === 0 ? sortedData.map((item) => item.avg) : sortedData.map((item) => item.numFails);

									return {
										datasetId,
										queryType: chartTypes[queryIndex], // Use chart type label
										data: {
											labels: departments,
											datasets: [
												{
													label: `${chartTypes[queryIndex]} (${datasetId})`,
													data: values,
													backgroundColor: `rgba(${75 + queryIndex * 40}, 192, 192, 0.6)`,
													borderColor: `rgba(${75 + queryIndex * 40}, 192, 192, 1)`,
													borderWidth: 1,
												},
											],
										},
									};
								}
							} else {
								throw new Error("Invalid response data");
							}
						})
					);
				})
			);

			// Flatten and set charts
			setChartDataArray(charts.flat());
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
					<Text fontWeight="bold">{`Dataset: ${chart.datasetId}, Query: ${chart.queryType}`}</Text>
					<Bar
						data={chart.data}
						options={
							chart.options || {
								responsive: true,
								plugins: {
									legend: {
										display: true,
										position: "top",
									},
									title: {
										display: true,
										text: `Top 5 Departments by ${chart.queryType} (${chart.datasetId})`,
									},
								},
							}
						}
					/>
				</VStack>
			))}
		</VStack>
	);
}

export default InsightsButton;
