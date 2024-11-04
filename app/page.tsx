"use client";
import React, { useState, useEffect } from "react";
import {
  addItem,
  getItems,
  updateItem,
  deleteItem,
  listTables,
  listSchemas,
  registerSchema,
  updateSchema,
  getSchema,
  updateHead,
  dropTable,
  deleteSchema,
  validateItemAgainstSchema,
} from "@/actions/action";
import Popup from "@/components/Popup";
import { useRouter } from "next/navigation";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { Anybody } from "next/font/google";

interface TableData {
  id: number;
  lastUpdated?: string;
  [key: string]: any;
}

type FieldDef = {
  type: "number" | "boolean" | "string"; // You can add more types as needed
};

export default function DynamicPage() {
  const [activeTab, setActiveTab] = useState<string>("");
  const [tables, setTables] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<{ [key: string]: any }>({});
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isNewTablePopupOpen, setIsNewTablePopupOpen] = useState(false);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState<TableData[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState("");
  const [newTableAlias, setNewTableAlias] = useState("");
  const [newTableFields, setNewTableFields] = useState<
    { name: string; type: string }[]
  >([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState<string>("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);

  const [aliasField, setAliasField] = useState<string | null>(null);
  const [newAliasName, setNewAliasName] = useState<string>("");
  const itemsPerPage = 10;

  const router = useRouter();

  const handleCreateNewTable = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    try {
      const newSchema: { tableName: string; alias: string; fields: any } = {
        tableName: newTableName,
        alias: newTableAlias,
        fields: {},
      };

      newTableFields.forEach((field) => {
        newSchema.fields[field.name] = { type: field.type, required: true };
      });

      await registerSchema(newSchema);

      const updatedTables = await listTables();
      setTables(updatedTables);

      const newSchemas = { ...schemas, [newTableName]: newSchema };
      setSchemas(newSchemas);
      setActiveTab(newTableName);

      setIsNewTablePopupOpen(false);
      setNewTableName("");
      setNewTableAlias("");
      setNewTableFields([]);
    } catch (err) {
      console.error("Error creating new table:", err);
      alert(err instanceof Error ? err.message : "Failed to create new table");
    }
  };

  const DeleteConfirmationPopup = ({
    isOpen,
    onClose,
    onConfirm,
    tableName,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tableName: string;
  }) => {
    if (!isOpen) return null;

    return (
      <Popup isOpen={isOpen} onClose={onClose}>
        <div className="space-y-6">
          <h3 className="text-xl text-white font-semibold">Delete Table</h3>
          <p className="text-gray-300">
            Are you sure you want to delete the table ? This action cannot be
            undone.
          </p>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-500/20 text-gray-300 rounded-xl hover:bg-gray-500/30 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300"
            >
              Delete
            </button>
          </div>
        </div>
      </Popup>
    );
  };

  const handleEdit = (itemId: number) => {};

  const handleDeleteTable = async (tableName: string) => {
    try {
      await dropTable(tableName);
      await deleteSchema(tableName);

      // Update the tables list
      const updatedTables = await listTables();
      setTables(updatedTables);

      // If the deleted table was active, switch to another table
      if (activeTab === tableName) {
        setActiveTab(updatedTables[0] || "");
      }

      // Close the confirmation popup
      setTableToDelete(null);
      setIsDeleteConfirmOpen(false);

      // Clear the schemas and table data if needed
      const newSchemas = { ...schemas };
      delete newSchemas[tableName];
      setSchemas(newSchemas);

      if (activeTab === tableName) {
        setTableData([]);
        setFilteredData([]);
      }
    } catch (err) {
      console.error("Error deleting table:", err);
      alert(err instanceof Error ? err.message : "Failed to delete table");
    }
  };

  const handleEditFieldName = async (oldFieldName: string) => {
    if (newFieldName.length < 2) {
      setEditingField(null);
      return;
    }

    if (newFieldName.trim() !== "") {
      try {
        await updateHead(activeTab, oldFieldName, newFieldName);
        const schema = await getSchema(activeTab);
        setSchemas({ ...schemas, [activeTab]: schema });
        setEditingField(null);
        window.location.reload();
      } catch (err) {
        console.error("Error renaming field:", err);
        alert(err instanceof Error ? err.message : "Failed to rename field");
      }
    }
  };

  const addNewField = () => {
    setNewTableFields([...newTableFields, { name: "", type: "string" }]);
  };

  const updateField = (index: number, field: string, value: string) => {
    const updatedFields = [...newTableFields];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    setNewTableFields(updatedFields);
  };

  useEffect(() => {
    const initializeTables = async () => {
      try {
        setLoading(true);
        const tablesList = await listTables();
        setTables(tablesList);

        const schemaPromises = tablesList.map(async (table) => {
          const schema = await getSchema(table);
          return [table, schema] as [string, any];
        });

        const schemasData = Object.fromEntries(
          await Promise.all(schemaPromises)
        );
        setSchemas(schemasData);

        if (tablesList.length > 0 && !activeTab) {
          setActiveTab(tablesList[0]);
        }

        setError(null);
      } catch (err) {
        setError("Failed to load tables and schemas");
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeTables();
  }, [activeTab]);

  useEffect(() => {
    const loadTableData = async () => {
      if (!activeTab) return;

      try {
        setLoading(true);
        const data = await getItems(activeTab);
        console.log(data);
        const processedData = data.map((item: TableData, index: number) => ({
          ...item,
          Id: index + 1,
          LastUpdated: item.LastUpdated
            ? format(new Date(item.LastUpdated), "MMM dd, yyyy HH:mm:ss")
            : "",
        }));
        setTableData(processedData);
        setFilteredData(processedData);
        setError(null);
      } catch (err) {
        setError(`Failed to load ${activeTab} data`);
        console.error(`Error loading ${activeTab}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadTableData();
  }, [activeTab]);

  useEffect(() => {
    const filterData = async () => {
      setSearchLoading(true);
      const filtered = tableData.filter((item) =>
        Object.values(item).some(
          (val) =>
            val != null &&
            val.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredData(filtered);
      setPage(1);
      setSearchLoading(false);
    };

    const debounce = setTimeout(() => {
      filterData();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, tableData]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newItem: { [key: string]: any } = {};

    const schema = schemas[activeTab];

    // Type assertion for schema.fields
    Object.entries(schema.fields as { [key: string]: FieldDef }).forEach(
      ([field, fieldDef]) => {
        const value = formData.get(field);
        switch (fieldDef.type) {
          case "number":
            newItem[field] = value ? Number(value) : null;
            break;
          case "boolean":
            newItem[field] = value === "true";
            break;
          default:
            newItem[field] = value;
        }
      }
    );

    try {
      await validateItemAgainstSchema(activeTab, newItem);
      await addItem(activeTab, newItem);
      const updatedData = await getItems(activeTab);
      const processedData = updatedData.map(
        (item: TableData, index: number) => ({
          ...item,
          Id: index + 1,
          LastUpdated: item.LastUpdated
            ? format(new Date(item.LastUpdated), "MMM dd, yyyy HH:mm:ss")
            : "",
        })
      );
      setTableData(processedData);
      setIsPopupOpen(false);
    } catch (err) {
      console.error(`Error submitting ${activeTab}:`, err);
      alert(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const handleDelete = async (Id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteItem(activeTab, Id);
      const updatedData = await getItems(activeTab);
      const processedData = updatedData.map(
        (item: TableData, index: number) => ({
          ...item,
          Id: index + 1,
          LastUpdated: item.LastUpdated
            ? format(new Date(item.LastUpdated), "MMM dd, yyyy HH:mm:ss")
            : "",
        })
      );
      setTableData(processedData);
    } catch (err) {
      console.error(`Error deleting ${activeTab}:`, err);
      alert("Failed to delete item");
    }
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const activeSchema = schemas[activeTab];
  const fields = activeSchema ? Object.keys(activeSchema.fields) : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-400 via-gray-700 to-gray-900 w-full p-8">
      {/* Glass Container */}
      <div className="backdrop-blur-md bg-black/30 rounded-3xl border border-white/10 shadow-2xl p-8 max-w-[95%] mx-auto mt-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          {/* Table Tabs */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2 w-full md:w-auto">
            <div className="flex gap-3 p-1 bg-black/20 rounded-2xl backdrop-blur-sm">
              {tables.map((table) => (
                <div key={table} className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab(table)}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      activeTab === table
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50 scale-105 transform"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Database className="w-4 h-4 inline-block mr-2" />
                    {table}
                  </button>
                </div>
              ))}
              <button
                onClick={() => setIsNewTablePopupOpen(true)}
                className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-500/30 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" /> New Table
              </button>
            </div>
          </div>

          <div className="flex">
            <button
              onClick={() => {
                setTableToDelete(activeTab);
                setIsDeleteConfirmOpen(true);
              }}
              className="p-2 hover:bg-red-500/20 rounded-full transition-colors duration-300 group"
            >
              <Trash2
                size={40}
                className="text-red-400 group-hover:text-red-300 transition-colors duration-300"
              />
            </button>
            <button
              onClick={() => setIsPopupOpen(true)}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 flex items-center group"
            >
              <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Add New Item
            </button>
          </div>
        </div>
        {schemas[activeTab] ? (
          <div className="flex items-center gap-4 text-white mb-10">
            {aliasField === activeTab ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAliasName}
                  onChange={(e) => setNewAliasName(e.target.value)}
                  className="text-4xl px-4 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Enter new alias"
                />
                <button
                  onClick={async () => {
                    try {
                      await updateSchema(activeTab, newAliasName);
                      const schema = await getSchema(activeTab);
                      setSchemas({ ...schemas, [activeTab]: schema });
                      setAliasField(null);
                      setNewAliasName("");
                    } catch (err) {
                      console.error("Error updating alias:", err);
                      alert(
                        err instanceof Error
                          ? err.message
                          : "Failed to update alias"
                      );
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-6xl">{schemas[activeTab].alias}</span>
                <button
                  onClick={() => {
                    setAliasField(activeTab);
                    setNewAliasName(schemas[activeTab].alias);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors duration-300"
                >
                  <Edit
                    size={24}
                    className="text-blue-400 hover:text-blue-300"
                  />
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Search Bar */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
          />
          <Search
            className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
        </div>

        {/* Loading States */}
        {(loading || searchLoading) && (
          <div className="flex justify-center items-center my-8">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Table Section */}
        {!loading && filteredData.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10 backdrop-blur-md">
            <table className="w-full">
              <thead>
                <tr className="bg-black/40">
                  <th className="px-6 py-4 text-left text-gray-300 font-medium">
                    ID
                  </th>
                  {fields.map((field) => (
                    <th
                      key={field}
                      className="px-6 py-4 text-left text-gray-300 font-medium"
                    >
                      {editingField === field ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            className="px-3 py-1 bg-black/30 border border-white/20 rounded-lg text-white"
                          />
                          <button
                            onClick={() => handleEditFieldName(field)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {field}
                          <button
                            onClick={() => setEditingField(field)}
                            className="text-blue-400 hover:text-blue-300 transition-colors duration-300"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-gray-300 font-medium">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentData.map((item) => (
                  <tr
                    key={item.Id}
                    className="group hover:bg-white/5 transition-colors duration-300 cursor-pointer"
                    onClick={() => router.push(`/${activeTab}/${item.id}`)}
                  >
                    <td className="px-6 py-4 text-blue-400">{item.Id}</td>
                    {fields.map((field) => (
                      <td key={field} className="px-6 py-4 text-gray-300">
                        {item[field]}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-gray-400">
                      {item.LastUpdated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredData.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-black/20 rounded-2xl border border-white/10">
            No data found
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 ${
              page <= 1
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-black/20 text-gray-300 hover:bg-white/10"
            }`}
          >
            <ChevronLeft size={20} /> Previous
          </button>
          <div className="px-6 py-3 bg-black/20 rounded-xl text-gray-300">
            Page {page} of {totalPages}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 ${
              page >= totalPages
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-black/20 text-gray-300 hover:bg-white/10"
            }`}
          >
            Next <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Popups */}
      <Popup
        isOpen={isNewTablePopupOpen}
        onClose={() => setIsNewTablePopupOpen(false)}
      >
        <form onSubmit={handleCreateNewTable} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Table Name</label>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Table Alias</label>
            <input
              type="text"
              value={newTableAlias}
              onChange={(e) => setNewTableAlias(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Fields</label>
            {newTableFields.map((field, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(index, "name", e.target.value)}
                  placeholder="Field Name"
                  className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(index, "type", e.target.value)}
                  className="w-1/3 px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                </select>
              </div>
            ))}
            <button
              type="button"
              onClick={addNewField}
              className="mt-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all duration-300"
            >
              + Add Field
            </button>
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 shadow-lg shadow-blue-500/30"
          >
            Create Table
          </button>
        </form>
      </Popup>

      <Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {fields.map((field) => (
            <div key={field}>
              <label className="block text-gray-300 mb-2">{field}</label>
              <input
                type={activeSchema.fields[field].type}
                name={field}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
          ))}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 shadow-lg shadow-blue-500/30"
          >
            Add Item
          </button>
        </form>
      </Popup>
      {/* Delete Confirmation Popup */}
      <DeleteConfirmationPopup
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setTableToDelete(null);
        }}
        onConfirm={() => tableToDelete && handleDeleteTable(tableToDelete)}
        tableName={tableToDelete || ""}
      />
    </main>
  );
}
