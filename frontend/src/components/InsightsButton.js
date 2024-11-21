import React, { useState } from "react";
import { Button, VStack, Text } from "@chakra-ui/react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import BuildQueries from "./Queries";

// Register Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

function InsightsButton() {
	const [chartData, setChartData] = useState(null); // State for chart data
	const [loading, setLoading] = useState(false); // Loading state
	const [error, setError] = useState(null); // Error state

	const fetchInsights = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await axios.post("http://localhost:4321/query", BuildQueries("sections"), {
				headers: { "Content-Type": "application/json" },
			});

			if (response.status === 200 && response.data.result) {
				// Process the response to get the top 5 departments
				const sortedData = response.data.result
					.sort((a, b) => b.avg - a.avg) // Sort by avg descending
					.slice(0, 5); // Get top 5

				const departments = sortedData.map((item) => item.sections_dept);
				const averages = sortedData.map((item) => item.avg);

				// Set chart data
				setChartData({
					labels: departments,
					datasets: [
						{
							label: "Average Scores",
							data: averages,
							backgroundColor: "rgba(75, 192, 192, 0.6)",
							borderColor: "rgba(75, 192, 192, 1)",
							borderWidth: 1,
						},
					],
				});
			}
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
			{chartData && (
				<Bar
					data={chartData}
					options={{
						responsive: true,
						plugins: {
							legend: {
								display: true,
								position: "top",
							},
							title: {
								display: true,
								text: "Top 5 Departments by Average Scores",
							},
						},
					}}
				/>
			)}
		</VStack>
	);
};

export default InsightsButton;
