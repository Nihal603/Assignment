import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid } from "@mui/x-data-grid";
import {
  TextField,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
} from "@mui/material";
import { server } from "../server";
import Statistics from "./Statistics";
import SalesStatistics from "./SalesStatistics";
const ProductTable = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(3); // Default to March
  const [page, setPage] = useState(1); // For pagination
  const [totalPages, setTotalPages] = useState(1); // For total number of pages
  const [rowsPerPage, setRowsPerPage] = useState(10); // Rows per page

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
    setPage(1);
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    setPage(1);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getProducts = async (month, searchTerm, pageNumber, limit) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${server}/product/getProduct`, {
        params: {
          month,
          search: searchTerm,
          page: pageNumber,
          per_page: limit,
        },
      });
      setProducts(data.products);
      setTotalPages(data.total_pages);
    } catch (error) {
      setError("Failed to fetch products. Please try again later.");
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProducts(selectedMonth, filter, page, rowsPerPage);
  }, [selectedMonth, filter, page, rowsPerPage]);

  const columns = [
    { field: "id", headerName: "ID", minWidth: 50, flex: 0.5 },
    { field: "title", headerName: "Title", minWidth: 200, flex: 2 },
    { field: "description", headerName: "Description", minWidth: 200, flex: 2 },
    { field: "price", headerName: "Price", minWidth: 100, flex: 1 },
    { field: "category", headerName: "Category", minWidth: 150, flex: 1.5 },
    { field: "sold", headerName: "Sold", minWidth: 150, flex: 1.5 },
    {
      field: "image",
      headerName: "Image",
      minWidth: 100,
      renderCell: (params) => (
        <img
          src={params.value}
          alt={params.row.title}
          style={{ width: "50px", height: "50px" }}
        />
      ),
      flex: 1,
    },
  ];

  const rows = products.map((item) => ({
    id: item._id,
    title: item.title,
    description: item.description,
    price: item.price,
    category: item.category,
    sold: item.sold,
    image: item.image,
  }));
  const paginationModel = { page: 0, pageSize: 10 };
  return (
    <>
      <div className="w-full flex justify-center pt-5">
        <div className="w-[97%]">
          <h3 className="text-[22px] font-Poppins pb-2">All Products</h3>

          <div className="mb-4 flex justify-between items-center">
            <FormControl variant="outlined" sx={{ minWidth: 120 }}>
              <InputLabel id="month-select-label">Month</InputLabel>
              <Select
                labelId="month-select-label"
                value={selectedMonth}
                onChange={handleMonthChange}
                label="Month"
              >
                {months.map((month, index) => (
                  <MenuItem key={index} value={index + 1}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Search by Title/Description/Price"
              variant="outlined"
              fullWidth
              value={filter}
              onChange={handleFilterChange}
              sx={{ ml: 2 }}
            />
          </div>

          <div className="w-full min-h-[45vh] bg-white rounded">
            {loading ? (
              <CircularProgress />
            ) : (
              <>
                <DataGrid
                  rows={rows}
                  columns={columns}
                  initialState={{ pagination: { paginationModel } }}
                  pageSizeOptions={[10]}
                  sx={{ border: 0 }}
                />
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <Statistics selectedMonth={selectedMonth} />
      <SalesStatistics selectedMonth={selectedMonth} />
    </>
  );
};

export default ProductTable;
