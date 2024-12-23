import React from 'react';
import { Layout, Menu } from 'lucide-react';

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b">
          <h1 className="text-xl font-bold text-gray-800">Project Hub</h1>
        </div>
        <nav className="p-4">
          <div className="space-y-2">
            <a href="#" className="flex items-center rounded-lg p-2 text-gray-600 hover:bg-gray-100">
              <Layout className="mr-3 h-5 w-5" />
              Dashboard
            </a>
            <a href="#" className="flex items-center rounded-lg p-2 text-gray-600 hover:bg-gray-100">
              <Menu className="mr-3 h-5 w-5" />
              Projects
            </a>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search..."
              className="rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-4">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Create
            </button>
            <div className="h-8 w-8 rounded-full bg-gray-300"></div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-gray-600">Here's what's happening in your projects</p>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Project Card */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">Active Projects</h3>
              <p className="text-3xl font-bold text-blue-600">12</p>
            </div>

            {/* Tasks Card */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">Open Tasks</h3>
              <p className="text-3xl font-bold text-green-600">48</p>
            </div>

            {/* Team Card */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">Team Members</h3>
              <p className="text-3xl font-bold text-purple-600">24</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
