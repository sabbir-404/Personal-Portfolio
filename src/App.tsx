import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Code, Camera, Mail, Github, Linkedin, Instagram, Aperture, Terminal, Layers, User, X, ExternalLink, Database, Cpu, Globe, Smartphone, Server, Upload, Trash2, LogIn, LogOut, Settings, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import React, { useState, useMemo, ReactNode, useEffect, Component } from "react";
import { cn } from "@/lib/utils";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, getDocFromServer } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { AdminPanel } from "./components/AdminPanel";

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error && parsed.operationType) {
          displayMessage = `Database Error (${parsed.operationType}): ${parsed.error}. Please check security rules.`;
        }
      } catch (e) {
        displayMessage = error.message || String(error);
      }

      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-12 text-center">
          <div className="max-w-md p-8 bg-red-900/20 border border-red-500/30 rounded-3xl">
            <h2 className="text-2xl font-bold mb-4">Application Error</h2>
            <p className="text-slate-400 mb-6">{displayMessage}</p>
            <Button onClick={() => window.location.reload()}>Reload Application</Button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Types ---
type Mode = "main" | "photographer" | "admin";

interface Project {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  tech: string[];
  techIcons: any[];
  repoUrl: string;
  category: string;
  className?: string;
  content?: ReactNode;
}

// --- Components ---

const Button = ({ className, variant = "primary", children, onClick, icon: Icon }: any) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 transform active:scale-95 cursor-pointer";
  const variants = {
    primary: "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]",
    secondary: "bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 shadow-sm",
    glass: "bg-white/5 backdrop-blur-md text-white border border-white/10 hover:bg-white/10",
    outline: "border border-slate-700 hover:bg-slate-800 text-slate-300"
  };

  return (
    <button onClick={onClick} className={cn(baseStyles, variants[variant as keyof typeof variants], className)}>
      {children}
      {Icon && <Icon className="w-4 h-4" />}
    </button>
  );
};

const Section = ({ className, children, id }: any) => (
  <section id={id} className={cn("py-24 px-6 md:px-12 max-w-7xl mx-auto", className)}>
    {children}
  </section>
);

const BentoCard = ({ className, children, title, subtitle, techIcons, onClick, dark = true }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    onClick={onClick}
    className={cn(
      "relative overflow-hidden rounded-3xl p-8 transition-all duration-500 cursor-pointer group",
      dark ? "bg-[#111] text-slate-100 border border-white/5" : "bg-slate-900 text-slate-100 border border-white/10",
      className
    )}
  >
    <div className="relative z-10 h-full flex flex-col">
      {children}
      <div className="mt-auto pt-8">
        {subtitle && <p className={cn("text-sm font-medium mb-1", dark ? "text-cyan-500/80" : "text-slate-400")}>{subtitle}</p>}
        {title && <h3 className="text-2xl font-semibold tracking-tight group-hover:text-cyan-400 transition-colors">{title}</h3>}
        {techIcons && (
          <div className="flex gap-2 mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
            {techIcons.map((Icon: any, i: number) => (
              <Icon key={i} className="w-4 h-4" />
            ))}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

const ProjectModal = ({ project, onClose }: { project: Project | null, onClose: () => void }) => {
  if (!project) return null;

  return (
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid md:grid-cols-2">
              <div className="relative h-64 md:h-full bg-gradient-to-br from-cyan-900/40 to-blue-900/40 flex items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
                {project.content || <Code className="w-32 h-32 text-cyan-500/20" />}
              </div>
              
              <div className="p-8 md:p-12 flex flex-col">
                <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-2">{project.subtitle}</p>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6 tracking-tight">{project.title}</h2>
                <p className="text-slate-400 leading-relaxed mb-8">
                  {project.description}
                </p>
                
                <div className="mb-8">
                  <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">Technologies Used</h4>
                  <div className="flex flex-wrap gap-3">
                    {project.tech.map((t, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex gap-4">
                  <Button variant="primary" icon={Github} onClick={() => window.open(project.repoUrl, '_blank')}>
                    View Repository
                  </Button>
                  <Button variant="secondary" icon={ExternalLink}>
                    Live Demo
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Clean Backgroundless Self Image Component for Developer Side ---
const FuturisticAvatar = ({ customSrc }: { customSrc?: string }) => {
  const baseSources = [
    "/self_image_dev.jpg",
    "/self_image_dev.png",
    "/self_image_dev.jpeg",
    "/self_image.jpg",
    "/self_image.png",
    "/self_image.jpeg",
    "/uploads/self_image_dev.jpg",
    "/uploads/self_image_dev.png",
    "/uploads/self_image.jpg",
    "/uploads/self_image.png",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop"
  ];
  
  const sources = useMemo(() => {
    if (customSrc) {
      return [customSrc, ...baseSources];
    }
    return baseSources;
  }, [customSrc]);

  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex(sourceIndex + 1);
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[3/4] flex items-center justify-center p-4">
      <div className="relative w-full max-w-xs h-full min-h-[360px] overflow-hidden bg-transparent group">
        {/* Soft, simple cyan backdrop glow */}
        <div className="absolute inset-x-0 bottom-0 top-1/4 bg-gradient-to-t from-cyan-500/10 via-cyan-500/2 to-transparent blur-3xl opacity-80 pointer-events-none -z-10" />
        
        {/* Clean, backgroundless self-portrait using a linear mask fadeout */}
        <img 
          src={sources[sourceIndex]} 
          onError={handleError}
          alt="Sabbir Islam Alvi" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-all duration-1000 ease-in-out group-hover:scale-105"
          style={{ 
            maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
          }}
        />
      </div>
    </div>
  );
};

// --- Clean Backgroundless Self Image Component for Photography Side ---
const PhotographerAvatar = ({ customSrc }: { customSrc?: string }) => {
  const baseSources = [
    "/self_image_photo.jpg",
    "/self_image_photo.png",
    "/self_image_photo.jpeg",
    "/self_image.jpg",
    "/self_image.png",
    "/self_image.jpeg",
    "/uploads/self_image_photo.jpg",
    "/uploads/self_image_photo.png",
    "/uploads/self_image.jpg",
    "/uploads/self_image.png",
    "https://images.unsplash.com/photo-1610216705422-caa3fcb6d158?q=80&w=1000&auto=format&fit=crop"
  ];

  const sources = useMemo(() => {
    if (customSrc) {
      return [customSrc, ...baseSources];
    }
    return baseSources;
  }, [customSrc]);

  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex(sourceIndex + 1);
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[3/4] flex items-center justify-center p-4">
      <div className="relative w-full max-w-xs h-full min-h-[360px] overflow-hidden bg-transparent group">
        {/* Soft, simple orange backdrop glow */}
        <div className="absolute inset-x-0 bottom-0 top-1/4 bg-gradient-to-t from-orange-500/10 via-orange-500/2 to-transparent blur-3xl opacity-80 pointer-events-none -z-10" />
        
        {/* Clean, backgroundless self-portrait using a linear mask fadeout */}
        <img 
          src={sources[sourceIndex]} 
          onError={handleError}
          alt="Sabbir Islam Alvi - Photographer" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-all duration-1000 ease-in-out group-hover:scale-105"
          style={{ 
            maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
          }}
        />
      </div>
    </div>
  );
};


// --- Main Portfolio (Developer + Intro) ---

interface MainPortfolioProps {
  onSwitchMode: () => void;
  onAdmin: () => void;
  devSettings: any;
  devProjects: any[];
}

const MainPortfolio = ({ onSwitchMode, onAdmin, devSettings, devProjects }: MainPortfolioProps) => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Helper to map dynamic text technology strings to gorgeous Lucide icons
  const getTechIcon = (techName: string) => {
    const name = techName.toLowerCase();
    if (name.includes("react") || name.includes("next") || name.includes("vue") || name.includes("angular")) return Globe;
    if (name.includes("node") || name.includes("express") || name.includes("fastapi") || name.includes("django")) return Server;
    if (name.includes("postgres") || name.includes("sql") || name.includes("database") || name.includes("redis") || name.includes("mongo")) return Database;
    if (name.includes("python") || name.includes("pytorch") || name.includes("machine") || name.includes("ai") || name.includes("tensor")) return Cpu;
    if (name.includes("mobile") || name.includes("ios") || name.includes("android") || name.includes("smartphone")) return Smartphone;
    return Code;
  };

  const projects = useMemo(() => {
    if (devProjects && devProjects.length > 0) {
      return devProjects.map((p, idx) => ({
        id: p.id || idx,
        title: p.title,
        subtitle: p.subtitle,
        category: p.category,
        description: p.description,
        tech: p.tech ? p.tech.split(",").map((s: string) => s.trim()) : [],
        techIcons: p.tech ? p.tech.split(",").slice(0, 3).map((t: string) => getTechIcon(t)) : [Code],
        repoUrl: p.repoUrl || "#",
        className: idx % 3 === 0 ? "md:col-span-2" : "",
        content: p.thumbnail ? (
          <img src={p.thumbnail} alt={p.title} className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-all duration-500" referrerPolicy="no-referrer" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-64 h-64 bg-cyan-500 rounded-full blur-[100px]" />
          </div>
        )
      }));
    }

    return [
      {
        id: 1,
        title: "AI Image Generator",
        subtitle: "Machine Learning",
        category: "Machine Learning",
        description: "A deep learning model that generates high-fidelity images from textual descriptions using Diffusion models. Built with PyTorch and integrated into a React frontend.",
        tech: ["PyTorch", "React", "FastAPI", "Tailwind"],
        techIcons: [Cpu, Globe, Server],
        repoUrl: "https://github.com/sabbir/ai-gen",
        className: "md:col-span-2",
        content: (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-64 h-64 bg-cyan-500 rounded-full blur-[100px]" />
          </div>
        )
      },
      {
        id: 2,
        title: "E-Commerce API",
        subtitle: "Backend System",
        category: "Web Development",
        description: "A robust, scalable RESTful API for modern e-commerce platforms. Features include JWT authentication, real-time inventory tracking, and Stripe integration.",
        tech: ["Node.js", "Express", "PostgreSQL", "Redis"],
        techIcons: [Server, Database, Code],
        repoUrl: "https://github.com/sabbir/shop-api",
        content: (
          <div className="h-full flex items-center justify-center">
            <div className="w-32 h-32 bg-[#1a1a1a] rounded-2xl rotate-12 shadow-2xl border border-white/10 flex items-center justify-center">
              <Code className="w-10 h-10 text-cyan-500/50" />
            </div>
          </div>
        )
      },
      {
        id: 3,
        title: "Portfolio V1",
        subtitle: "Web Design",
        category: "Web Development",
        description: "My first professional portfolio website, focusing on minimalist design and smooth user experience. Built with pure HTML/CSS and subtle JS animations.",
        tech: ["HTML5", "CSS3", "JavaScript"],
        techIcons: [Globe, Layers],
        repoUrl: "https://github.com/sabbir/portfolio-v1",
        content: (
          <div className="h-full flex items-center justify-center">
            <Layers className="w-16 h-16 text-blue-500/30" />
          </div>
        )
      },
      {
        id: 4,
        title: "Smart Home Dashboard",
        subtitle: "IoT & React",
        category: "Web Development",
        description: "A real-time dashboard for monitoring and controlling IoT devices within a smart home ecosystem. Uses WebSockets for low-latency updates.",
        tech: ["React", "Socket.io", "MQTT", "Node.js"],
        techIcons: [Smartphone, Server, Cpu],
        repoUrl: "https://github.com/sabbir/smart-home",
        className: "md:col-span-2",
        content: (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
            <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-[#1a1a1a] rounded-tl-3xl border-t border-l border-white/10 shadow-2xl p-6">
              <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30" />
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30" />
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30" />
              </div>
              <div className="h-4 w-1/2 bg-white/5 rounded mb-2" />
              <div className="h-4 w-1/3 bg-white/5 rounded" />
            </div>
          </>
        )
      }
    ];
  }, [devProjects]);

  const skills = useMemo(() => {
    if (devSettings?.skillsList) {
      return devSettings.skillsList.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    return ["React", "TypeScript", "Node.js", "Python", "Next.js", "PostgreSQL", "Docker", "AWS"];
  }, [devSettings?.skillsList]);

  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") return projects;
    return projects.filter(p => p.category === activeFilter);
  }, [activeFilter, projects]);

  const filters = ["All", "Web Development", "Machine Learning"];

  const hireStatus = devSettings?.isAvailableForHire ?? true;
  const devName = devSettings?.name || "Sabbir Islam Alvi";

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans selection:bg-cyan-500/30">
      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
              <Code className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight text-lg text-slate-100">{devName}</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#home" className="hover:text-slate-100 transition-colors">Home</a>
            <a href="#projects" className="hover:text-slate-100 transition-colors">Projects</a>
            <a href="#stack" className="hover:text-slate-100 transition-colors">Stack</a>
            <button onClick={onSwitchMode} className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors font-semibold bg-orange-400/10 px-3 py-1.5 rounded-full">
              <Camera className="w-4 h-4" /> Photography
            </button>
          </div>

          <Button 
            variant="secondary" 
            className="px-5 py-2 text-sm" 
            icon={Mail}
            onClick={() => window.location.href = `mailto:${devSettings?.contactEmail || "SABBIRISLAMALVI070800@gmail.com"}`}
          >
            Contact
          </Button>
        </div>
      </nav>

      {/* Hero Section with Apple-style Pop-up */}
      <section id="home" className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Ambient Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#050505] to-[#050505] -z-20" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">
          
          {/* Left: Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10"
          >
            {hireStatus && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Available for hire
              </div>
            )}
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-6 text-slate-100">
              {devSettings?.headline ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  {devSettings.headline}
                </span>
              ) : (
                <>
                  Hello, I'm <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Sabbir Islam Alvi.</span>
                </>
              )}
            </h1>
            <p className="text-xl text-slate-400 max-w-lg leading-relaxed mb-8">
              {devSettings?.subheadline || (
                <>
                  I am a <span className="font-semibold text-slate-200">Coder</span> building the future, and a <span className="font-semibold text-slate-200">Photographer</span> capturing the present.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" icon={ArrowRight} onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}>
                View Work
              </Button>
              <Button variant="secondary" icon={Camera} onClick={onSwitchMode}>
                Photography Portfolio
              </Button>
            </div>
          </motion.div>

          {/* Right: Person Preview Pop-up */}
          <div className="relative flex justify-center md:justify-end h-full items-center">
            {/* Futuristic Glow Behind Image */}
            <div className="absolute w-[120%] h-[120%] bg-gradient-to-t from-cyan-950/20 via-cyan-900/10 to-transparent rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute w-72 h-72 bg-cyan-500/5 rounded-full blur-[80px] -z-10" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative z-10 w-full max-w-md flex justify-center items-center"
            >
              <FuturisticAvatar customSrc={devSettings?.avatarUrl} />
              
              {/* Floating Badge */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute bottom-4 -right-2 md:-right-6 bg-[#0c0c0c]/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-cyan-500/20 max-w-[200px] z-30 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-100 leading-tight">{devName}</p>
                    <p className="text-[10px] text-cyan-400 font-medium uppercase tracking-wider mt-0.5">CSE & Photography</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Grid Projects (Reused) */}
      <Section id="projects">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 mb-4">Selected Work</h2>
            <div className="flex flex-wrap gap-2">
              {filters.map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    activeFilter === filter 
                      ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
                      : "bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <a href="#projects" className="text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px]"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <BentoCard 
                key={project.id}
                className={project.className} 
                title={project.title} 
                subtitle={project.subtitle} 
                techIcons={project.techIcons}
                onClick={() => setSelectedProject(project)}
                dark
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111]/90 z-0" />
                <div className="absolute top-8 right-8 z-10">
                  <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                    <ArrowRight className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                {project.content}
              </BentoCard>
            ))}
          </AnimatePresence>
        </motion.div>
      </Section>

      {/* Tech Stack */}
      <Section id="stack" className="bg-[#111] border border-white/5 text-slate-100 rounded-3xl my-12 mx-6 max-w-[calc(100%-3rem)] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent -z-10" />
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Technologies</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            I work with a modern stack to build performant and scalable applications.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {skills.map((tech) => (
            <div key={tech} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300">
              <div className="font-semibold text-lg text-slate-300">{tech}</div>
            </div>
          ))}
        </div>
      </Section>
      
      {/* Footer */}
      <footer className="py-12 text-center text-slate-500 text-sm border-t border-white/5 flex flex-col items-center justify-center gap-2">
        <p className="flex items-center justify-center gap-2">
          <span>© {new Date().getFullYear()} {devName}. All rights reserved.</span>
          <button 
            onClick={onAdmin} 
            className="text-slate-700 hover:text-cyan-400 transition-colors p-1 rounded-full hover:bg-white/5" 
            title="Admin Access"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </p>
      </footer>
    </div>
  );
};

// --- Featured Images Banner Component ---
const FeaturedImagesBanner = ({ slides }: { slides: any[] }) => {
  const featuredImages = useMemo(() => {
    if (slides && slides.length > 0) {
      return slides;
    }
    return [
      {
        src: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1600&auto=format&fit=crop",
        title: "Alps at Midnight",
        category: "Landscape",
        desc: "A long-exposure capture of alpine peaks standing proud under a stellar, star-studded sky.",
        specs: "50mm · f/1.8 · 25s · ISO 1600"
      },
      {
        src: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1600&auto=format&fit=crop",
        title: "Neon Reflections",
        category: "Urban / Night",
        desc: "Rainy streets of Tokyo alive with high-contrast reflection of cyberpunk-inspired neon signage.",
        specs: "35mm · f/1.4 · 1/80s · ISO 400"
      },
      {
        src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1600&auto=format&fit=crop",
        title: "Chiaroscuro Silhouette",
        category: "Portrait",
        desc: "Studio portraiture emphasizing high contrast shadows and clean emotive highlights.",
        specs: "85mm · f/1.2 · 1/200s · ISO 100"
      },
      {
        src: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1600&auto=format&fit=crop",
        title: "The Turquoise Abyss",
        category: "Nature",
        desc: "Stunning overhead drone photograph capturing the explosive energy of rolling waves crashing on basalt rock.",
        specs: "24mm · f/4.0 · 1/1000s · ISO 200"
      }
    ];
  }, [slides]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featuredImages.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredImages.length) % featuredImages.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredImages.length);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-12 mb-16 mt-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="text-left">
          <span className="text-xs font-mono uppercase tracking-widest text-orange-500">Curated Works</span>
          <h2 className="text-2xl md:text-3xl font-serif italic mt-1">Featured Showcase</h2>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button 
            onClick={handlePrev}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={handleNext}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Image */}
            <img 
              src={featuredImages[currentIndex].src} 
              alt={featuredImages[currentIndex].title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-70 filter contrast-105"
            />
            
            {/* Elegant vignette and details backdrop overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />

            {/* Slide details overlay content */}
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
              <div className="max-w-xl text-left">
                <span className="text-[10px] uppercase font-mono tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20 inline-block mb-3">
                  {featuredImages[currentIndex].category}
                </span>
                <h3 className="text-2xl md:text-4xl font-serif italic text-white mb-2 leading-tight">
                  {featuredImages[currentIndex].title}
                </h3>
                <p className="text-xs md:text-sm text-slate-300 font-light tracking-wide line-clamp-2 md:line-clamp-none">
                  {featuredImages[currentIndex].desc}
                </p>
              </div>

              {/* Specs & Meta details badge */}
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                <span className="text-[10px] font-mono text-slate-400/80 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block animate-pulse" />
                  {featuredImages[currentIndex].specs}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots indicators */}
        <div className="absolute top-6 right-6 flex gap-2 z-20">
          {featuredImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 bg-white",
                currentIndex === idx ? "w-6 opacity-100" : "w-1.5 opacity-30 hover:opacity-60"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Photographer Portfolio ---

interface Photo {
  src: string;
  title: string;
  category: string;
  event: string;
  height: string;
}

interface PhotographerPortfolioProps {
  onBack: () => void;
  onAdmin: () => void;
  photoSettings: any;
  showcaseSlides: any[];
  awards: any[];
  photos: any[];
}

const PhotographerPortfolio = ({ 
  onBack, 
  onAdmin, 
  photoSettings, 
  showcaseSlides, 
  awards, 
  photos 
}: PhotographerPortfolioProps) => {
  const [activeEvent, setActiveEvent] = useState("All");

  const galleryPhotos = useMemo(() => {
    if (photos && photos.length > 0) {
      return photos;
    }
    return [
      { 
        src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop", 
        title: "Grand Opening Gala", 
        category: "Events", 
        event: "Corporate",
        height: "h-[400px]" 
      },
      { 
        src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop", 
        title: "Studio Session", 
        category: "Portrait", 
        event: "Portraits",
        height: "h-[500px]" 
      },
      { 
        src: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop", 
        title: "Street Style", 
        category: "Street", 
        event: "Urban",
        height: "h-[350px]" 
      },
      { 
        src: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=800&auto=format&fit=crop", 
        title: "Night Horizon", 
        category: "Landscape", 
        event: "Nature",
        height: "h-[450px]" 
      }
    ];
  }, [photos]);

  const timelineAwards = useMemo(() => {
    if (awards && awards.length > 0) {
      return awards;
    }
    return [
      { year: "2025", title: "Best Portrait Photographer", org: "National Arts Awards", desc: "Awarded for the 'Faces of the City' series." },
      { year: "2024", title: "Official Event Photographer", org: "Tech Summit Global", desc: "Covered the 3-day international conference in San Francisco." },
      { year: "2023", title: "Solo Exhibition: 'Urban Decay'", org: "Modern Art Gallery", desc: "A month-long showcase of street photography." },
    ];
  }, [awards]);

  const gearSpecs = useMemo(() => {
    if (photoSettings?.specsList) {
      return photoSettings.specsList.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
    }
    return ["LEICA M11", "SUMMILUX 50MM", "RAW PRO-RES"];
  }, [photoSettings?.specsList]);

  const filteredPhotos = useMemo(() => {
    if (activeEvent === "All") return galleryPhotos;
    return galleryPhotos.filter(p => p.event === activeEvent);
  }, [activeEvent, galleryPhotos]);

  const eventFilters = ["All", "Corporate", "Portraits", "Urban", "Nature"];

  const photographerName = photoSettings?.name || "Sabbir Islam Alvi";

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
       {/* Nav */}
       <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Camera className="w-4 h-4 text-black" />
            </div>
            <span className="font-medium tracking-widest uppercase text-sm">{photographerName}</span>
          </div>
          <div className="flex items-center gap-6">
             <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">
                <Code className="w-4 h-4" /> Developer Portfolio
             </button>
             <Button 
                variant="glass" 
                className="px-5 py-2 text-xs uppercase tracking-widest"
                onClick={() => {
                  if (photoSettings?.bookNowUrl) {
                    window.open(photoSettings.bookNowUrl, '_blank');
                  } else {
                    window.location.href = `mailto:${photoSettings?.contactEmail || "SABBIRISLAMALVI070800@gmail.com"}`;
                  }
                }}
             >
                Book Now
             </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative min-h-[45vh] w-full overflow-hidden flex items-center bg-[#050505] border-b border-white/5 pt-20 pb-8">
        {/* Background Ambient Image */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-15 filter blur-sm">
           <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative w-full max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-12 gap-8 md:gap-12 items-center z-10">
          {/* Left: Text Info */}
          <div className="md:col-span-7 text-left flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-xs uppercase tracking-widest text-orange-500 font-mono font-medium mb-3 block">
                Visual Artistry & Creative Direction
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif italic tracking-tight mb-6 text-white leading-tight">
                {photoSettings?.headline || "Captured Moments"}
              </h1>
              <p className="text-base sm:text-lg text-slate-400 max-w-xl font-light tracking-wide leading-relaxed mb-8">
                {photoSettings?.subheadline || "A professional visual journey through events, cinematic portraitures, urban stories, and the subtle, unseen beauty of the natural world."}
              </p>
              
              {/* Camera metadata tags badge */}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                {gearSpecs.map((spec: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full">[ {spec} ]</span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Photographer Self-Portrait */}
          <div className="md:col-span-5 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <PhotographerAvatar customSrc={photoSettings?.avatarUrl} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Hero Banner to Display Important Featured Images */}
      <FeaturedImagesBanner slides={showcaseSlides} />

      {/* Gallery Grid */}
      <Section>
        <div className="flex flex-col items-center mb-16">
          <h2 className="text-3xl font-serif italic mb-8">Gallery</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {eventFilters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveEvent(filter)}
                className={cn(
                  "px-6 py-2 rounded-full text-xs uppercase tracking-widest font-medium transition-all duration-300 border",
                  activeEvent === filter 
                    ? "bg-white text-black border-white" 
                    : "bg-transparent text-white/50 border-white/10 hover:border-white/30"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <motion.div layout className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredPhotos.map((item, i) => (
              <motion.div 
                key={item.id || item.src || i}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                whileHover={{ scale: 1.02 }}
                className={cn("group relative overflow-hidden rounded-2xl bg-slate-900 cursor-pointer break-inside-avoid mb-6", item.height || "h-[400px]")}
              >
                <img 
                  src={item.src} 
                  alt={item.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <p className="text-orange-400 text-xs uppercase tracking-widest mb-1 font-bold">{item.category}</p>
                  <h3 className="text-xl font-medium text-white">{item.title}</h3>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </Section>

      {/* Achievements / Events List */}
      <Section className="bg-neutral-900 rounded-3xl my-12 mx-4 md:mx-12 max-w-[calc(100%-2rem)] md:max-w-[calc(100%-6rem)]">
        <div className="flex flex-col md:flex-row gap-12 items-start">
          <div className="md:w-1/3">
            <h2 className="text-4xl font-serif italic mb-6">Achievements & <br/>Events</h2>
            <p className="text-neutral-400">A timeline of my professional journey in photography, including exhibitions, awards, and major coverage.</p>
          </div>
          <div className="md:w-2/3 space-y-8 w-full">
            {timelineAwards.map((item, i) => (
              <div key={item.id || i} className="flex gap-6 border-b border-white/10 pb-8 last:border-0 text-left">
                <span className="text-orange-500 font-mono text-lg shrink-0">{item.year}</span>
                <div>
                  <h3 className="text-xl font-medium mb-2 text-white">{item.title}</h3>
                  <p className="text-sm text-neutral-400 uppercase tracking-wider mb-2">{item.org}</p>
                  <p className="text-neutral-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <footer className="py-12 text-center text-neutral-600 text-sm flex flex-col items-center justify-center gap-2">
        <div className="flex justify-center gap-6 mb-4">
           <Instagram className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
           <Mail className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
        </div>
        <p className="flex items-center justify-center gap-2">
          <span>© {new Date().getFullYear()} {photographerName} Photography.</span>
          <button 
            onClick={onAdmin} 
            className="text-neutral-800 hover:text-orange-500 transition-colors p-1 rounded-full hover:bg-white/5" 
            title="Admin Access"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </p>
      </footer>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<Mode>("photographer");
  const [devSettings, setDevSettings] = useState<any>(null);
  const [photoSettings, setPhotoSettings] = useState<any>(null);
  const [devProjects, setDevProjects] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [showcaseSlides, setShowcaseSlides] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);

  // 1. Listen to Developer Settings
  useEffect(() => {
    return onSnapshot(doc(db, "settings", "developer"), (docSnap) => {
      if (docSnap.exists()) {
        setDevSettings(docSnap.data());
      }
    }, (error) => {
      console.error("Error reading developer settings:", error);
    });
  }, []);

  // 2. Listen to Photography Settings
  useEffect(() => {
    return onSnapshot(doc(db, "settings", "photography"), (docSnap) => {
      if (docSnap.exists()) {
        setPhotoSettings(docSnap.data());
      }
    }, (error) => {
      console.error("Error reading photography settings:", error);
    });
  }, []);

  // 3. Listen to Developer Projects
  useEffect(() => {
    const q = query(collection(db, "dev_projects"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setDevProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error reading dev projects:", error);
    });
  }, []);

  // 4. Listen to Awards
  useEffect(() => {
    const q = query(collection(db, "awards"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setAwards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error reading awards:", error);
    });
  }, []);

  // 5. Listen to Showcase
  useEffect(() => {
    const q = query(collection(db, "featured_showcase"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setShowcaseSlides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error reading showcase slides:", error);
    });
  }, []);

  // 6. Listen to Photos Gallery
  useEffect(() => {
    const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error reading gallery photos:", error);
    });
  }, []);

  return (
    <ErrorBoundary>
      <main>
        {mode === "main" && (
          <MainPortfolio 
            onSwitchMode={() => setMode("photographer")} 
            onAdmin={() => setMode("admin")}
            devSettings={devSettings}
            devProjects={devProjects}
          />
        )}
        {mode === "photographer" && (
          <PhotographerPortfolio 
            onBack={() => setMode("main")} 
            onAdmin={() => setMode("admin")} 
            photoSettings={photoSettings}
            showcaseSlides={showcaseSlides}
            awards={awards}
            photos={photos}
          />
        )}
        {mode === "admin" && (
          <AdminPanel 
            onBack={() => setMode("photographer")} 
            devSettings={devSettings}
            photoSettings={photoSettings}
            devProjects={devProjects}
            awards={awards}
            showcaseSlides={showcaseSlides}
            photos={photos}
          />
        )}
      </main>
    </ErrorBoundary>
  );
}
