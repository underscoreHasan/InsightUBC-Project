import React, { useState } from "react";
import logo from "./assets/ubc-logo.jpg";
import "./App.css";
import { Provider } from "./components/ui/provider";
import { VStack, Image, Button } from "@chakra-ui/react";
import AddButton from "./components/AddButton";
import RemoveButton from "./components/RemoveButton";
import ListButton from "./components/ListButton";
import InsightsButton from "./components/InsightsButton";

function App() {
	const [showOptionsMenu, setShowOptionsMenu] = useState(false); // State to toggle the view

	return (
		<Provider>
			<BackButton onClick={() => setShowOptionsMenu(false)}></BackButton>
			<VStack>
				{!showOptionsMenu ? (
					<>
						<Image src={logo} alt="UBC Logo"></Image>
						<Button onClick={() => setShowOptionsMenu(true)}>Sections Insight</Button>
					</>
				) : (
					<OptionsMenu />
				)}
			</VStack>
		</Provider>
	);
}

function OptionsMenu() {
	return (
		<>
			<AddButton></AddButton>
			<RemoveButton></RemoveButton>
			<ListButton></ListButton>
			<InsightsButton></InsightsButton>
		</>
	);
}

function BackButton({ onClick }) {
	return (
		<Button
			position="absolute"
			top={4}
			left={4}
			onClick={onClick} // Go back to the logo and button
		>
			Go Back
		</Button>
	);
}

export default App;
