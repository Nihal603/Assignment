import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { server } from "../server";

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SalesStatistics = ({ selectedMonth }) => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStatistics = async (month) => {
    try {
      const { data } = await axios.get(`${server}/product/sales-statistics`, {
        params: { month },
      });
      setStatistics(data.statistics);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics(selectedMonth);
  }, [selectedMonth]);

  const chartData = {
    labels: statistics.map((stat) => stat.priceRange),
    datasets: [
      {
        label: "Total Sold Items",
        data: statistics.map((stat) => stat.totalSoldItems),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  return (
    <div className="mt-5 p-4">
      <h2>Bar chart Statistics for Month: {selectedMonth}</h2>
      {loading ? <p>Loading...</p> : <Bar data={chartData} />}
    </div>
  );
};

export default SalesStatistics;
