"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChatItem {
  id: number;
  type: "News" | "Meme" | "Update";
  content: string;
}

export default function AdminChat() {
  const [items, setItems] = useState<ChatItem[]>([
    { id: 1, type: "News", content: "New business regulations released" },
    { id: 2, type: "Meme", content: "https://i.imgur.com/xyz123.jpg" },
  ]);

  const [newType, setNewType] = useState<"News" | "Meme" | "Update">("News");
  const [newContent, setNewContent] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<ChatItem | null>(null);

  const handleAdd = () => {
    if (newType === "Meme" && !newImage) return;
    if ((newType !== "Meme") && !newContent.trim()) return;

    const newItem: ChatItem = {
      id: Date.now(),
      type: newType,
      content: newType === "Meme" ? URL.createObjectURL(newImage!) : newContent,
    };

    setItems([...items, newItem]);
    setNewContent("");
    setNewImage(null);
  };

  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleEdit = (item: ChatItem) => {
    setEditingItem(item);
    setNewType(item.type);
    setNewContent(item.content);
  };

  const handleUpdate = () => {
    if (!newContent.trim()) return;
    setItems(
      items.map((item) =>
        item.id === editingItem!.id
          ? { ...item, type: newType, content: newContent }
          : item
      )
    );
    setEditingItem(null);
    setNewContent("");
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Chats Management</h1>

      {/* Add / Edit Form */}
      <div className="flex flex-col gap-3 mb-6">
        <Select value={newType} onValueChange={(value: "News" | "Meme" | "Update") => {
          setNewType(value);
          setNewContent("");
          setNewImage(null);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="News">News</SelectItem>
            <SelectItem value="Meme">Meme</SelectItem>
            <SelectItem value="Update">Update</SelectItem>
          </SelectContent>
        </Select>

        {newType === "Meme" ? (
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setNewImage(e.target.files?.[0] || null)}
            className="border rounded px-3 py-1"
          />
        ) : (
          <Input
            type="text"
            placeholder={`Enter ${newType}...`}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="border rounded px-3 py-1"
          />
        )}

        {editingItem ? (
          <Button
            onClick={handleUpdate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Update
          </Button>
        ) : (
          <Button
            onClick={handleAdd}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Add
          </Button>
        )}
      </div>

      {/* Items List */}
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="bg-gray-100 p-3 rounded shadow flex flex-col gap-2"
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold">{item.type}</span>
              <div className="space-x-2">
                <Button
                  onClick={() => handleEdit(item)}
                  className="bg-black text-white px-3 py-1 rounded hover:bg-gray-600"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>

            {item.type === "Meme" ? (
              <img
                src={item.content}
                alt="Meme"
                className="rounded-lg max-h-64 object-contain border"
              />
            ) : (
              <p>{item.content}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
