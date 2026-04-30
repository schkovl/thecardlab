import wembyImg from "@/assets/cards/wemby.png";
import herbertImg from "@/assets/cards/herbert.png";
import charizardImg from "@/assets/cards/charizard.png";
import lawrenceImg from "@/assets/cards/lawrence.png";
import ohtaniImg from "@/assets/cards/ohtani.png";

export const mockScans = [
  { id: 1, card: "2023 Prizm Victor Wembanyama Silver", date: "Just now", expectedGrade: "PSA 10", expectedValue: "$1,850", image: wembyImg, condition: "Mint" },
  { id: 2, card: "2020 Prizm Justin Herbert RC", date: "2 hours ago", expectedGrade: "PSA 9", expectedValue: "$420", image: herbertImg, condition: "Near Mint" },
  { id: 3, card: "1999 Pokemon Base Charizard", date: "5 hours ago", expectedGrade: "PSA 8", expectedValue: "$1,200", image: charizardImg, condition: "Excellent" },
  { id: 4, card: "2021 Select Trevor Lawrence", date: "Yesterday", expectedGrade: "PSA 10", expectedValue: "$350", image: lawrenceImg, condition: "Mint" },
  { id: 5, card: "2018 Topps Update Shohei Ohtani", date: "Yesterday", expectedGrade: "PSA 9", expectedValue: "$480", image: ohtaniImg, condition: "Near Mint" },
];
