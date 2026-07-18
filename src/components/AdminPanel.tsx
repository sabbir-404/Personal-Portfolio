import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ArrowRight, Code, Camera, Mail, Github, Linkedin, Instagram, 
  Database, Cpu, Globe, Smartphone, Server, Upload, Trash2, 
  LogIn, LogOut, Settings, Award, Image, Sliders, FileText, 
  Save, Check, Plus, Loader2, Link, ExternalLink, Sparkles, User
} from "lucide-react";

interface AdminPanelProps {
  onBack: () => void;
  devSettings: any;
  photoSettings: any;
  devProjects: any[];
  awards: any[];
  showcaseSlides: any[];
  photos: any[];
}

// --- Auth Token Helper ---
function getToken(): string | null {
  return localStorage.getItem("portfolio_admin_token");
}

function setToken(token: string) {
  localStorage.setItem("portfolio_admin_token", token);
}

function clearToken() {
  localStorage.removeItem("portfolio_admin_token");
}

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: any = {
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBack,
  devSettings,
  photoSettings,
  devProjects,
  awards,
  showcaseSlides,
  photos
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"dev-settings" | "dev-projects" | "photo-settings" | "photo-gallery" | "showcase" | "awards">("dev-settings");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Form States
  const [devForm, setDevForm] = useState({
    name: "",
    headline: "",
    subheadline: "",
    avatarUrl: "",
    isAvailableForHire: true,
    contactEmail: "",
    githubUrl: "",
    linkedinUrl: "",
    instagramUrl: "",
    skillsList: ""
  });

  const [photoForm, setPhotoForm] = useState({
    headline: "",
    subheadline: "",
    avatarUrl: "",
    specsList: "",
    bookNowUrl: ""
  });

  const [projectForm, setProjectForm] = useState({
    title: "",
    subtitle: "",
    category: "Web Development",
    description: "",
    tech: "",
    repoUrl: "",
    liveUrl: "",
    thumbnail: ""
  });

  const [awardForm, setAwardForm] = useState({
    year: "",
    title: "",
    org: "",
    desc: ""
  });

  const [showcaseForm, setShowcaseForm] = useState({
    title: "",
    category: "Portrait",
    desc: "",
    specs: "",
    src: ""
  });

  const [galleryForm, setGalleryForm] = useState({
    title: "",
    category: "",
    event: "Portraits",
    height: "h-[400px]",
    src: ""
  });

  // Files for upload
  const [devAvatarFile, setDevAvatarFile] = useState<File | null>(null);
  const [photoAvatarFile, setPhotoAvatarFile] = useState<File | null>(null);
  const [projectThumbFile, setProjectThumbFile] = useState<File | null>(null);
  const [showcaseFile, setShowcaseFile] = useState<File | null>(null);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);

  // Check if already authenticated on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetch("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) {
            setIsLoggedIn(true);
          } else {
            clearToken();
          }
          setIsAuthReady(true);
        })
        .catch(() => {
          clearToken();
          setIsAuthReady(true);
        });
    } else {
      setIsAuthReady(true);
    }
  }, []);

  // Initialize Developer Form with settings
  useEffect(() => {
    if (devSettings) {
      setDevForm({
        name: devSettings.name || "",
        headline: devSettings.headline || "",
        subheadline: devSettings.subheadline || "",
        avatarUrl: devSettings.avatarUrl || "",
        isAvailableForHire: devSettings.isAvailableForHire ?? true,
        contactEmail: devSettings.contactEmail || "",
        githubUrl: devSettings.githubUrl || "",
        linkedinUrl: devSettings.linkedinUrl || "",
        instagramUrl: devSettings.instagramUrl || "",
        skillsList: devSettings.skillsList || ""
      });
    }
  }, [devSettings]);

  // Initialize Photography Form with settings
  useEffect(() => {
    if (photoSettings) {
      setPhotoForm({
        headline: photoSettings.headline || "",
        subheadline: photoSettings.subheadline || "",
        avatarUrl: photoSettings.avatarUrl || "",
        specsList: photoSettings.specsList || "",
        bookNowUrl: photoSettings.bookNowUrl || ""
      });
    }
  }, [photoSettings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      setToken(data.token);
      setIsLoggedIn(true);
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    }
  };

  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
  };

  // Reusable file uploader using current express API
  const uploadImage = async (file: File): Promise<string> => {
    setUploadProgress("Uploading file to Hostinger storage...");
    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Upload failed");
    }

    const data = await res.json();
    return data.url;
  };

  // 1. Save Developer Settings
  const handleSaveDevSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setUploadProgress(null);

    try {
      let finalAvatarUrl = devForm.avatarUrl;
      if (devAvatarFile) {
        finalAvatarUrl = await uploadImage(devAvatarFile);
      }

      await authFetch("/api/settings/developer", {
        method: "PUT",
        body: JSON.stringify({
          ...devForm,
          avatarUrl: finalAvatarUrl,
        }),
      });

      setDevForm(prev => ({ ...prev, avatarUrl: finalAvatarUrl }));
      setDevAvatarFile(null);
      alert("Developer settings saved successfully!");
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  // 2. Save Photography Settings
  const handleSavePhotoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setUploadProgress(null);

    try {
      let finalAvatarUrl = photoForm.avatarUrl;
      if (photoAvatarFile) {
        finalAvatarUrl = await uploadImage(photoAvatarFile);
      }

      await authFetch("/api/settings/photography", {
        method: "PUT",
        body: JSON.stringify({
          ...photoForm,
          avatarUrl: finalAvatarUrl,
        }),
      });

      setPhotoForm(prev => ({ ...prev, avatarUrl: finalAvatarUrl }));
      setPhotoAvatarFile(null);
      alert("Photography settings saved successfully!");
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  // 3. Save Developer Project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setUploadProgress(null);

    try {
      let finalThumbnail = projectForm.thumbnail;
      if (projectThumbFile) {
        finalThumbnail = await uploadImage(projectThumbFile);
      }

      await authFetch("/api/dev-projects", {
        method: "POST",
        body: JSON.stringify({
          title: projectForm.title,
          subtitle: projectForm.subtitle,
          category: projectForm.category,
          description: projectForm.description,
          tech: projectForm.tech,
          repo_url: projectForm.repoUrl,
          live_url: projectForm.liveUrl,
          thumbnail: finalThumbnail,
        }),
      });

      setProjectForm({
        title: "",
        subtitle: "",
        category: "Web Development",
        description: "",
        tech: "",
        repoUrl: "",
        liveUrl: "",
        thumbnail: ""
      });
      setProjectThumbFile(null);
      alert("Project added successfully!");
    } catch (err: any) {
      alert(`Failed to add project: ${err.message}`);
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await authFetch(`/api/dev-projects/${id}`, { method: "DELETE" });
      alert("Project deleted.");
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  // 4. Save Award/Achievement
  const handleAddAward = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await authFetch("/api/awards", {
        method: "POST",
        body: JSON.stringify({
          year: awardForm.year,
          title: awardForm.title,
          org: awardForm.org,
          description: awardForm.desc,
        }),
      });
      setAwardForm({ year: "", title: "", org: "", desc: "" });
      alert("Award / Achievement added successfully!");
    } catch (err: any) {
      alert(`Failed to add achievement: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAward = async (id: number) => {
    if (!confirm("Are you sure you want to delete this achievement?")) return;
    try {
      await authFetch(`/api/awards/${id}`, { method: "DELETE" });
      alert("Achievement deleted.");
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // 5. Save Showcase Slide
  const handleAddShowcase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showcaseFile && !showcaseForm.src) {
      alert("Please upload an image or provide a valid source URL.");
      return;
    }
    setIsSaving(true);
    setUploadProgress(null);

    try {
      let finalSrc = showcaseForm.src;
      if (showcaseFile) {
        finalSrc = await uploadImage(showcaseFile);
      }

      await authFetch("/api/featured-showcase", {
        method: "POST",
        body: JSON.stringify({
          src: finalSrc,
          title: showcaseForm.title,
          category: showcaseForm.category,
          description: showcaseForm.desc,
          specs: showcaseForm.specs,
        }),
      });

      setShowcaseForm({
        title: "",
        category: "Portrait",
        desc: "",
        specs: "",
        src: ""
      });
      setShowcaseFile(null);
      alert("Showcase slide added successfully!");
    } catch (err: any) {
      alert(`Failed to add showcase slide: ${err.message}`);
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteShowcase = async (id: number) => {
    if (!confirm("Are you sure you want to delete this showcase slide?")) return;
    try {
      await authFetch(`/api/featured-showcase/${id}`, { method: "DELETE" });
      alert("Showcase slide deleted.");
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // 6. Save Gallery Photo
  const handleAddGalleryPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryFile && !galleryForm.src) {
      alert("Please select a file or provide an image URL.");
      return;
    }
    setIsSaving(true);
    setUploadProgress(null);

    try {
      let finalSrc = galleryForm.src;
      if (galleryFile) {
        finalSrc = await uploadImage(galleryFile);
      }

      await authFetch("/api/photos", {
        method: "POST",
        body: JSON.stringify({
          src: finalSrc,
          title: galleryForm.title,
          category: galleryForm.category || galleryForm.event,
          event: galleryForm.event,
          height: galleryForm.height,
        }),
      });

      setGalleryForm({
        title: "",
        category: "",
        event: "Portraits",
        height: "h-[400px]",
        src: ""
      });
      setGalleryFile(null);
      alert("Photo uploaded and added to your portfolio gallery successfully!");
    } catch (err: any) {
      alert(`Failed to add photo: ${err.message}`);
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteGalleryPhoto = async (id: number) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      await authFetch(`/api/photos/${id}`, { method: "DELETE" });
      alert("Photo deleted.");
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 mb-4">
              <Settings className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Admin Control Panel</h1>
            <p className="text-slate-500 text-sm mt-2 text-center">Sign in with your admin credentials</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input 
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-cyan-500 text-black hover:bg-cyan-400 font-medium py-3 px-6 rounded-full transition active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button 
              type="button"
              onClick={onBack} 
              className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors mt-2"
            >
              Back to Portfolio
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest text-center leading-relaxed">
              Only authorized administrators can access this panel. <br/>
              All data is stored securely on your TrueNAS PostgreSQL.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-slate-100 font-sans selection:bg-cyan-500/30 flex">
      {/* Sidebar Navigation */}
      <aside className="w-80 bg-[#0c0c0c] border-r border-white/5 flex flex-col p-6 shrink-0 h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 leading-tight">Admin Engine</h2>
            <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase mt-0.5">Dual-Portfolio</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab("dev-settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "dev-settings" 
                ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Sliders className="w-4 h-4" /> Developer Profile
          </button>
          <button 
            onClick={() => setActiveTab("dev-projects")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "dev-projects" 
                ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Code className="w-4 h-4" /> Developer Projects
          </button>
          <button 
            onClick={() => setActiveTab("photo-settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "photo-settings" 
                ? "bg-orange-500/10 text-orange-400 border-l-2 border-orange-500" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Sliders className="w-4 h-4" /> Photography Profile
          </button>
          <button 
            onClick={() => setActiveTab("photo-gallery")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "photo-gallery" 
                ? "bg-orange-500/10 text-orange-400 border-l-2 border-orange-500" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Image className="w-4 h-4" /> Gallery Photos
          </button>
          <button 
            onClick={() => setActiveTab("showcase")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "showcase" 
                ? "bg-orange-500/10 text-orange-400 border-l-2 border-orange-500" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4" /> Showcase Slides
          </button>
          <button 
            onClick={() => setActiveTab("awards")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "awards" 
                ? "bg-orange-500/10 text-orange-400 border-l-2 border-orange-500" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Award className="w-4 h-4" /> Achievements Timeline
          </button>
        </nav>

        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-xl text-emerald-400 text-xs">
            <Database className="w-4 h-4 shrink-0" />
            <span className="font-mono">TrueNAS PostgreSQL</span>
          </div>
          <button 
            onClick={onBack}
            className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Portfolios
          </button>
          <button 
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out Admin
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-12 overflow-y-auto h-screen relative">
        {/* Saving Loader overlay */}
        {isSaving && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-white">Saving Changes</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-sm">
              {uploadProgress || "Writing data to TrueNAS PostgreSQL..."}
            </p>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-500 font-mono">Dynamic Content Engine</span>
              <h1 className="text-3xl font-bold tracking-tight mt-1 text-white">
                {activeTab === "dev-settings" && "Developer Portfolio Text & Avatar"}
                {activeTab === "dev-projects" && "Developer Bento Projects"}
                {activeTab === "photo-settings" && "Photography Portfolio Details"}
                {activeTab === "photo-gallery" && "Photography Gallery Masonry"}
                {activeTab === "showcase" && "Photography Featured Showcase Slide"}
                {activeTab === "awards" && "Achievements & Timeline Events"}
              </h1>
            </div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Live Preview <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TAB 1: Developer Settings */}
          {activeTab === "dev-settings" && (
            <form onSubmit={handleSaveDevSettings} className="space-y-8">
              <div className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Primary Info & Hero Section</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                    <input 
                      type="text"
                      value={devForm.name}
                      onChange={e => setDevForm({ ...devForm, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contact Email</label>
                    <input 
                      type="email"
                      value={devForm.contactEmail}
                      onChange={e => setDevForm({ ...devForm, contactEmail: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hero Main Headline</label>
                    <input 
                      type="text"
                      value={devForm.headline}
                      onChange={e => setDevForm({ ...devForm, headline: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hero Description (Subheadline)</label>
                    <textarea 
                      value={devForm.subheadline}
                      onChange={e => setDevForm({ ...devForm, subheadline: e.target.value })}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/2 p-4 rounded-2xl border border-white/5">
                  <input 
                    type="checkbox"
                    id="hire_status"
                    checked={devForm.isAvailableForHire}
                    onChange={e => setDevForm({ ...devForm, isAvailableForHire: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 accent-cyan-500 bg-white/5 border-white/10 rounded"
                  />
                  <label htmlFor="hire_status" className="text-sm font-medium text-slate-300 select-none cursor-pointer">
                    Show "Available for hire" status indicator on profile
                  </label>
                </div>
              </div>

              {/* Developer Avatar Image Upload */}
              <div className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Profile Avatar Photo (Thumbnail)</h3>
                
                <div className="grid md:grid-cols-3 gap-8 items-center">
                  <div className="md:col-span-1 flex justify-center">
                    <div className="w-40 aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative group">
                      {devForm.avatarUrl ? (
                        <img 
                          src={devForm.avatarUrl} 
                          alt="Dev Avatar" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                          <User className="w-12 h-12 mb-2" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">No Photo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Upload Profile Portrait</label>
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={e => setDevAvatarFile(e.target.files?.[0] || null)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-black hover:file:bg-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Or Direct URL Override</label>
                      <input 
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={devForm.avatarUrl}
                        onChange={e => setDevForm({ ...devForm, avatarUrl: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500/50 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Developer Tech stack and social links */}
              <div className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Social Connections & Skills</h3>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">GitHub URL</label>
                    <input 
                      type="text"
                      value={devForm.githubUrl}
                      onChange={e => setDevForm({ ...devForm, githubUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">LinkedIn URL</label>
                    <input 
                      type="text"
                      value={devForm.linkedinUrl}
                      onChange={e => setDevForm({ ...devForm, linkedinUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Instagram URL</label>
                    <input 
                      type="text"
                      value={devForm.instagramUrl}
                      onChange={e => setDevForm({ ...devForm, instagramUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Skills / Tech Stack (Comma Separated)</label>
                  <input 
                    type="text"
                    placeholder="React, TypeScript, Node.js, Python, PostgreSQL"
                    value={devForm.skillsList}
                    onChange={e => setDevForm({ ...devForm, skillsList: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-2 font-mono">These technologies will be rendered in the dynamic Tech Stack bento card.</p>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition cursor-pointer"
              >
                <Save className="w-5 h-5" /> Save Developer Profile
              </button>
            </form>
          )}

          {/* TAB 2: Developer Projects */}
          {activeTab === "dev-projects" && (
            <div className="space-y-12">
              <form onSubmit={handleAddProject} className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Create New Project Card</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Project Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. AI Image Generator"
                      value={projectForm.title}
                      onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subtitle / Sub-domain</label>
                    <input 
                      type="text"
                      placeholder="e.g. Machine Learning"
                      value={projectForm.subtitle}
                      onChange={e => setProjectForm({ ...projectForm, subtitle: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category Filter</label>
                    <select 
                      value={projectForm.category}
                      onChange={e => setProjectForm({ ...projectForm, category: e.target.value })}
                      className="w-full bg-[#161616] border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    >
                      <option>Web Development</option>
                      <option>Machine Learning</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Technologies Used (Comma Separated)</label>
                    <input 
                      type="text"
                      placeholder="e.g. PyTorch, React, FastAPI, Tailwind"
                      value={projectForm.tech}
                      onChange={e => setProjectForm({ ...projectForm, tech: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Repository URL (GitHub)</label>
                    <input 
                      type="text"
                      placeholder="https://github.com/..."
                      value={projectForm.repoUrl}
                      onChange={e => setProjectForm({ ...projectForm, repoUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Live Demo URL (Optional)</label>
                    <input 
                      type="text"
                      placeholder="https://..."
                      value={projectForm.liveUrl}
                      onChange={e => setProjectForm({ ...projectForm, liveUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Project Description</label>
                  <textarea 
                    placeholder="Short description highlighting the project achievements, features, and specs..."
                    value={projectForm.description}
                    onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Project Banner / Preview Image (Optional)</label>
                  <div className="grid md:grid-cols-2 gap-6 items-center">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={e => setProjectThumbFile(e.target.files?.[0] || null)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                    />
                    <input 
                      type="text"
                      placeholder="Or enter image URL"
                      value={projectForm.thumbnail}
                      onChange={e => setProjectForm({ ...projectForm, thumbnail: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-5 h-5" /> Create Project Card
                </button>
              </form>

              {/* List Developer Projects */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-2">Current Bento Projects</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {devProjects.map((project) => (
                    <div key={project.id} className="bg-[#111] border border-white/5 rounded-3xl p-6 relative flex flex-col justify-between group">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              {project.category}
                            </span>
                            <h4 className="text-lg font-bold text-white mt-2 leading-tight">{project.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">{project.subtitle}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition duration-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 mb-4">
                          {project.description}
                        </p>
                      </div>

                      <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                          {project.tech}
                        </span>
                        <div className="flex gap-2">
                          <a href={project.repo_url || project.repoUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition">
                            <Github className="w-3.5 h-3.5" />
                          </a>
                          {(project.live_url || project.liveUrl) && (
                            <a href={project.live_url || project.liveUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {devProjects.length === 0 && (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-3xl text-slate-500 text-sm">
                      No dynamic projects stored yet. Currently falling back to static presentation.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Photography Settings */}
          {activeTab === "photo-settings" && (
            <form onSubmit={handleSavePhotoSettings} className="space-y-8">
              <div className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Photography Hero Info</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hero Main Headline</label>
                    <input 
                      type="text"
                      value={photoForm.headline}
                      onChange={e => setPhotoForm({ ...photoForm, headline: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hero Subheadline / Bio</label>
                    <textarea 
                      value={photoForm.subheadline}
                      onChange={e => setPhotoForm({ ...photoForm, subheadline: e.target.value })}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none resize-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Camera Gears & Specs (Comma Separated)</label>
                    <input 
                      type="text"
                      placeholder="LEICA M11, SUMMILUX 50MM, RAW PRO-RES"
                      value={photoForm.specsList}
                      onChange={e => setPhotoForm({ ...photoForm, specsList: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">"Book Now" URL Override</label>
                    <input 
                      type="text"
                      placeholder="e.g. calendly link or email mailto:"
                      value={photoForm.bookNowUrl}
                      onChange={e => setPhotoForm({ ...photoForm, bookNowUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Photographer Portrait */}
              <div className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Photographer Portrait Photo (Avatar)</h3>
                
                <div className="grid md:grid-cols-3 gap-8 items-center">
                  <div className="md:col-span-1 flex justify-center">
                    <div className="w-40 aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative group">
                      {photoForm.avatarUrl ? (
                        <img 
                          src={photoForm.avatarUrl} 
                          alt="Photo Avatar" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                          <Camera className="w-12 h-12 mb-2" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">No Photo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Upload Camera Portrait</label>
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={e => setPhotoAvatarFile(e.target.files?.[0] || null)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-500 file:text-black hover:file:bg-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Or Direct URL Override</label>
                      <input 
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={photoForm.avatarUrl}
                        onChange={e => setPhotoForm({ ...photoForm, avatarUrl: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-orange-500 text-black hover:bg-orange-400 font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition cursor-pointer"
              >
                <Save className="w-5 h-5" /> Save Photography Profile
              </button>
            </form>
          )}

          {/* TAB 4: Gallery Photos */}
          {activeTab === "photo-gallery" && (
            <div className="space-y-12">
              <form onSubmit={handleAddGalleryPhoto} className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Upload Image to Masonry Gallery</h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Photo Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Grand Opening Gala"
                      value={galleryForm.title}
                      onChange={e => setGalleryForm({ ...galleryForm, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sub-Category (Optional)</label>
                    <input 
                      type="text"
                      placeholder="e.g. Events / Candid (will default to Event filter if empty)"
                      value={galleryForm.category}
                      onChange={e => setGalleryForm({ ...galleryForm, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Event Filter Group</label>
                    <select 
                      value={galleryForm.event}
                      onChange={e => setGalleryForm({ ...galleryForm, event: e.target.value })}
                      className="w-full bg-[#161616] border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    >
                      <option>Portraits</option>
                      <option>Corporate</option>
                      <option>Urban</option>
                      <option>Nature</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Masonry Column Height</label>
                    <select 
                      value={galleryForm.height}
                      onChange={e => setGalleryForm({ ...galleryForm, height: e.target.value })}
                      className="w-full bg-[#161616] border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    >
                      <option value="h-[300px]">Short (h-[300px])</option>
                      <option value="h-[400px]">Medium (h-[400px])</option>
                      <option value="h-[500px]">Tall (h-[500px])</option>
                      <option value="h-[600px]">Extra Tall (h-[600px])</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Image File</label>
                  <div className="grid md:grid-cols-2 gap-6 items-center">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={e => setGalleryFile(e.target.files?.[0] || null)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                    />
                    <input 
                      type="text"
                      placeholder="Or enter direct URL"
                      value={galleryForm.src}
                      onChange={e => setGalleryForm({ ...galleryForm, src: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-500 text-black hover:bg-orange-400 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-5 h-5" /> Upload & Add to Gallery
                </button>
              </form>

              {/* Gallery List */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-2">Gallery Photos ({photos.length})</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {photos.map((photo) => (
                    <div key={photo.id} className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden group relative">
                      <div className="aspect-[4/3] relative">
                        <img 
                          src={photo.src} 
                          alt={photo.title}
                          className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition duration-300" 
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => handleDeleteGalleryPhoto(photo.id)}
                          className="absolute top-4 right-4 p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-sm text-white truncate">{photo.title}</h4>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[9px] font-bold uppercase bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">{photo.event}</span>
                          <span className="text-[9px] font-bold uppercase bg-white/5 text-slate-400 px-2 py-0.5 rounded border border-white/10 truncate max-w-[100px]">{photo.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {photos.length === 0 && (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-3xl text-slate-500 text-sm">
                      No gallery photos stored. Falling back to default showcase.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Showcase Slides */}
          {activeTab === "showcase" && (
            <div className="space-y-12">
              <form onSubmit={handleAddShowcase} className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Create Curated Showcase Banner Slide</h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Slide Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Alps at Midnight"
                      value={showcaseForm.title}
                      onChange={e => setShowcaseForm({ ...showcaseForm, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category Tag</label>
                    <input 
                      type="text"
                      placeholder="e.g. Landscape / Night"
                      value={showcaseForm.category}
                      onChange={e => setShowcaseForm({ ...showcaseForm, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Camera Specs Metadata</label>
                    <input 
                      type="text"
                      placeholder="e.g. 50mm · f/1.8 · 25s · ISO 1600"
                      value={showcaseForm.specs}
                      onChange={e => setShowcaseForm({ ...showcaseForm, specs: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Curated Image File</label>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={e => setShowcaseFile(e.target.files?.[0] || null)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Slide Description / Caption</label>
                  <textarea 
                    placeholder="Provide context or a storytelling description for this capture..."
                    value={showcaseForm.desc}
                    onChange={e => setShowcaseForm({ ...showcaseForm, desc: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Or Direct image URL Override</label>
                  <input 
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={showcaseForm.src}
                    onChange={e => setShowcaseForm({ ...showcaseForm, src: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none font-mono"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-500 text-black hover:bg-orange-400 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-5 h-5" /> Add Showcase Slide
                </button>
              </form>

              {/* Showcase list */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-2">Dynamic Showcase Banner Slides</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {showcaseSlides.map((slide) => (
                    <div key={slide.id} className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden group flex flex-col justify-between">
                      <div className="aspect-[16/9] relative bg-neutral-950">
                        <img 
                          src={slide.src} 
                          alt={slide.title}
                          className="w-full h-full object-cover opacity-70"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => handleDeleteShowcase(slide.id)}
                          className="absolute top-4 right-4 p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono tracking-widest uppercase bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded border border-orange-500/20 inline-block mb-2">
                            {slide.category}
                          </span>
                          <h4 className="text-lg font-semibold text-white leading-tight">{slide.title}</h4>
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{slide.desc || slide.description}</p>
                        </div>
                        <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>{slide.specs}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {showcaseSlides.length === 0 && (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-3xl text-slate-500 text-sm">
                      No custom showcase slides saved yet. Falling back to default slides.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Awards / Achievements */}
          {activeTab === "awards" && (
            <div className="space-y-12">
              <form onSubmit={handleAddAward} className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-semibold border-b border-white/5 pb-3">Add Award or Exhibition Milestone</h3>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Year</label>
                    <input 
                      type="text"
                      placeholder="e.g. 2026"
                      value={awardForm.year}
                      onChange={e => setAwardForm({ ...awardForm, year: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Award / Event Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Best Portrait Photographer"
                      value={awardForm.title}
                      onChange={e => setAwardForm({ ...awardForm, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Awarding Organization / Location</label>
                  <input 
                    type="text"
                    placeholder="e.g. National Arts Council"
                    value={awardForm.org}
                    onChange={e => setAwardForm({ ...awardForm, org: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Brief Context Description</label>
                  <textarea 
                    placeholder="Describe your achievement or high-level context of this event timeline milestone..."
                    value={awardForm.desc}
                    onChange={e => setAwardForm({ ...awardForm, desc: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none resize-none"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-500 text-black hover:bg-orange-400 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-5 h-5" /> Append Timeline Milestone
                </button>
              </form>

              {/* Achievements timeline list */}
              <div className="bg-[#111] border border-white/5 rounded-3xl p-8 space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">Timeline Milestones</h3>
                <div className="space-y-6">
                  {awards.map((item) => (
                    <div key={item.id} className="flex gap-6 border-b border-white/5 pb-6 last:border-0 last:pb-0 items-start">
                      <span className="text-orange-500 font-mono text-lg font-bold min-w-[60px]">{item.year}</span>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white leading-tight">{item.title}</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mt-1.5">{item.org}</p>
                        <p className="text-slate-400 text-sm mt-2 font-light leading-relaxed">{item.desc || item.description}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteAward(item.id)}
                        className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {awards.length === 0 && (
                    <div className="py-6 text-center text-slate-500 text-sm">
                      No custom Achievements saved yet. Falling back to default portfolio timeline.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
