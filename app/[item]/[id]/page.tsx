"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getItemById, updateItem, deleteItem, authenticateUser, getSchema } from "@/actions/action";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";
import { AiOutlineSync } from "react-icons/ai";

interface AuthResult {
  deviceCode?: string;
  verificationUrl?: string;
  verification_url?: string;
  message?: string;
}

interface Field {
  type: string;
  required?: boolean;
  enum?: string[];
  default?: any;
  format?: string;
}

export default function ItemDetails() {
  const { id, item: tableName } = useParams();
  const router = useRouter();
  const [itemData, setItemData] = useState<any | null>(null);
  const [schema, setSchema] = useState<{ fields: { [key: string]: Field } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({});
  const [editedItem, setEditedItem] = useState<any | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    if (id && tableName) {
      const loadData = async () => {
        try {
          setLoading(true);
          const [itemResult, schemaResult] = await Promise.all([
            getItemById(tableName as string, Number(id)),
            getSchema(tableName as string)
          ]);
          
          setItemData(itemResult);
          setEditedItem(itemResult);
          setSchema(schemaResult);
          
          // Initialize editing states for all fields
          const editingStates: { [key: string]: boolean } = {};
          Object.keys(schemaResult.fields).forEach(field => {
            editingStates[field] = false;
          });
          setIsEditing(editingStates);
        } catch (error) {
          setError("Failed to load item details.");
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [id, tableName]);

  const handleEditField = (field: string, value: any) => {
    if (editedItem) {
      const updatedItem = { ...editedItem, [field]: value };
      setEditedItem(updatedItem);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (editedItem && tableName) {
      try {
        await updateItem(tableName as string, editedItem.id, editedItem);
        setItemData(editedItem);
        setHasChanges(false);
        // Reset all editing states to false
        const resetEditing: { [key: string]: boolean } = {};
        Object.keys(isEditing).forEach(key => {
          resetEditing[key] = false;
        });
        setIsEditing(resetEditing);
      } catch (error) {
        setError("Failed to save changes.");
      }
    }
  };

  const handleCancel = () => {
    setEditedItem(itemData);
    setHasChanges(false);
    // Reset all editing states to false
    const resetEditing: { [key: string]: boolean } = {};
    Object.keys(isEditing).forEach(key => {
      resetEditing[key] = false;
    });
    setIsEditing(resetEditing);
  };

  const handleDelete = async () => {
    if (itemData && tableName) {
      try {
        await deleteItem(tableName as string, itemData.id);
        router.push('/');
      } catch (error) {
        setError("Failed to delete item.");
      }
    }
  };

  const handleAuthenticate = async () => {
    if (itemData) {
      setIsAuthLoading(true);
      setAuthResult(null);
      setShowIframe(false);
      try {
        const alias = itemData.name?.replace(/\s/g, '_') || itemData.id.toString();
        const result = await authenticateUser();
        console.log("Authentication result:", result);
        
        const normalizedResult = {
          ...result,
          verificationUrl: result.verificationUrl || result.verification_url
        };
        
        setAuthResult(normalizedResult);
        
        if (normalizedResult.verificationUrl) {
          setShowIframe(true);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setAuthResult({ message: 'Failed to authenticate.' });
      } finally {
        setIsAuthLoading(false);
      }
    }
  };

  const renderFieldInput = (fieldName: string, fieldDef: Field, value: any) => {
    if (fieldDef.enum) {
      return (
        <select
          value={value || '--None--'}
          onChange={(e) => handleEditField(fieldName, e.target.value)}
          className="border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
        >
          <option value="--None--">--None--</option>
          {fieldDef.enum.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    } else if (fieldDef.type === 'boolean') {
      return (
        <select
          value={value ? "true" : "false"}
          onChange={(e) => handleEditField(fieldName, e.target.value === "true")}
          className="border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      );
    } else {
      return (
        <input
          type={fieldDef.type === 'number' ? 'number' : 'text'}
          value={value || ''}
          onChange={(e) => handleEditField(fieldName, fieldDef.type === 'number' ? Number(e.target.value) : e.target.value)}
          className="border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
        />
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <div className="relative w-24 h-24">
          <div className="absolute w-full h-full border-4 border-blue-500 rounded-full animate-ping"></div>
          <div className="absolute w-full h-full border-4 border-blue-300 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <div className="text-red-500 text-xl font-bold bg-black/50 p-6 rounded-lg border border-red-500 animate-pulse">
          {error}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen text-blue-100 p-8 relative overflow-hidden bg-gradient-to-br from-gray-400 via-gray-700 to-gray-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-full opacity-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute h-px bg-blue-400 animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: 0,
                width: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {itemData && schema ? (
          <div className="backdrop-blur-sm bg-black/30 p-8 rounded-2xl border border-blue-500/30 shadow-2xl">
            <header className="flex justify-between items-center mb-8 border-b border-blue-500/30 pb-4">
              <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                  {tableName} Details
                </h1>
                <p className="text-blue-300 mt-2">ID: {id}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={handleDelete}
                  className="group relative px-6 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/50 transition-all duration-300"
                >
                  <span className="flex items-center gap-2">
                    <FiTrash2 className="w-5 h-5" />
                    Delete
                  </span>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-500/0 via-red-500/30 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>

                <button
                  onClick={handleAuthenticate}
                  disabled={isAuthLoading}
                  className="group relative px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/50 transition-all duration-300"
                >
                  <span className="flex items-center gap-2">
                    <AiOutlineSync className={`w-5 h-5 ${isAuthLoading ? 'animate-spin' : ''}`} />
                    Authenticate
                  </span>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500/0 via-emerald-500/30 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-8">
              {Object.entries(schema.fields).map(([fieldName, fieldDef]) => (
                <div
                  key={fieldName}
                  className="group text-2xl p-4 rounded-xl backdrop-blur-sm bg-black-900/10 border border-black-500/20 hover:border-black-400/40 transition-all duration-300"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-blue-300 font-medium">{fieldName}</span>
                    <button
                      onClick={() => setIsEditing({ ...isEditing, [fieldName]: !isEditing[fieldName] })}
                      className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors duration-200"
                    >
                      <FiEdit className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                  
                  <div className="mt-2">
                    {isEditing[fieldName] ? (
                      <div className="relative">
                        {renderFieldInput(fieldName, fieldDef, editedItem?.[fieldName])}
                        <div className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                      </div>
                    ) : (
                      <span className="text-lg font-semibold text-white">
                        {typeof itemData[fieldName] === 'boolean'
                          ? (itemData[fieldName] ? 'Yes' : 'No')
                          : (itemData[fieldName] || '-')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasChanges && (
              <div className="mt-8 flex justify-end gap-4">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 rounded-lg border border-gray-500/50 hover:bg-gray-500/20 transition-all duration-300 flex items-center gap-2"
                >
                  <FiX className="w-5 h-5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 rounded-lg bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 transition-all duration-300 flex items-center gap-2"
                >
                  <FiSave className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            )}

            {/* Authentication Result Display */}
            {authResult && (
              <div className="mt-6 p-4 rounded-lg bg-blue-500/20 border border-blue-500/30">
                {authResult.deviceCode && (
                  <p className="text-lg mb-2">Device Code: <span className="font-mono bg-black/30 px-2 py-1 rounded">{authResult.deviceCode}</span></p>
                )}
                {authResult.message && (
                  <p className="text-lg text-yellow-300">{authResult.message}</p>
                )}
              </div>
            )}

            {/* Authentication Loading Spinner */}
            {isAuthLoading && (
              <div className="mt-6 flex justify-center">
                <div className="relative w-16 h-16">
                  <div className="absolute w-full h-full border-4 border-blue-500 rounded-full animate-ping"></div>
                  <div className="absolute w-full h-full border-4 border-blue-300 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}

            {/* Authentication iFrame */}
            {showIframe && authResult?.verificationUrl && (
              <div className="mt-8">
                <div className="rounded-xl overflow-hidden border border-blue-500/30">
                  <iframe
                    src={authResult.verificationUrl}
                    className="w-full h-screen"
                    title="Authentication"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-2xl text-blue-300">No item details found.</div>
        )}
      </div>
    </main>
  );
}