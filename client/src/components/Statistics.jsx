import React, { useEffect, useState } from "react";
import axios from "axios";
import { server } from "../server";

const Statistics = ({ selectedMonth }) => {
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState("");

  const fetchStatistics = async (month) => {
    try {
      const response = await axios.get(`${server}/product/statistics`, {
        params: {
          month: month,
        },
      });
      setStatistics(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch statistics");
      setStatistics(null);
    }
  };
  useEffect(() => {
    fetchStatistics(selectedMonth);
  }, [selectedMonth]);

  return (
    <div className="statistics-container p-4">
      <h2>Sales Statistics</h2>

      {error && <p className="error-message">{error}</p>}

      {statistics && (
        <div className="statistics-results">
          <h3>Statistics for Month {selectedMonth}</h3>
          <p>Total Sale Amount: ₹{statistics.totalSales}</p>
          <p>Total Sold Items: {statistics.totalSoldItems}</p>
          <p>Total Not Sold Items: {statistics.totalNotSoldItems}</p>
        </div>
      )}
    </div>
  );
};

export default Statistics;
