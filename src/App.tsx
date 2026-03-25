import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Code, Camera, Mail, Github, Linkedin, Instagram, Aperture, Terminal, Layers, User, X, ExternalLink, Database, Cpu, Globe, Smartphone, Server } from "lucide-react";
import { useState, useMemo, ReactNode } from "react";
import { cn } from "@/lib/utils";

// --- Types ---
type Mode = "main" | "photographer";

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

// --- Main Portfolio (Developer + Intro) ---

const MainPortfolio = ({ onSwitchMode }: { onSwitchMode: () => void }) => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const projects: Project[] = [
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

  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") return projects;
    return projects.filter(p => p.category === activeFilter);
  }, [activeFilter]);

  const filters = ["All", "Web Development", "Machine Learning"];

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
            <span className="font-semibold tracking-tight text-lg text-slate-100">Sabbir Islam Alvi</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#home" className="hover:text-slate-100 transition-colors">Home</a>
            <a href="#projects" className="hover:text-slate-100 transition-colors">Projects</a>
            <a href="#stack" className="hover:text-slate-100 transition-colors">Stack</a>
            <button onClick={onSwitchMode} className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors font-semibold bg-orange-400/10 px-3 py-1.5 rounded-full">
              <Camera className="w-4 h-4" /> Photography
            </button>
          </div>

          <Button variant="secondary" className="px-5 py-2 text-sm" icon={Mail}>Contact</Button>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Available for hire
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-6 text-slate-100">
              Hello, I'm <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Sabbir Islam Alvi.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-lg leading-relaxed mb-8">
              I am a <span className="font-semibold text-slate-200">Coder</span> building the future, and a <span className="font-semibold text-slate-200">Photographer</span> capturing the present.
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
          <div className="relative flex justify-center md:justify-end h-full items-end">
            {/* Futuristic Glow Behind Image */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[140%] h-[80%] bg-gradient-to-t from-cyan-900/40 via-blue-900/10 to-transparent rounded-full blur-3xl -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -z-10" />
            
            <motion.div
              initial={{ y: 120, opacity: 0, filter: 'blur(10px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              transition={{ 
                type: "spring",
                stiffness: 60,
                damping: 20,
                delay: 0.2
              }}
              className="relative z-10 w-full max-w-md flex justify-center"
            >
              {/* Image with CSS Masking for backgroundless pop-up effect */}
              <img 
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop" 
                alt="Sabbir Islam Alvi" 
                className="w-full h-auto object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.15)]"
                style={{ 
                  maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
                }}
              />
              
              {/* Floating Badge */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute bottom-12 -right-4 md:-right-8 bg-[#111]/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/10 max-w-[200px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-100 leading-tight">Sabbir Islam Alvi</p>
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
          <a href="#" className="text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
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
          {["React", "TypeScript", "Node.js", "Python", "Next.js", "PostgreSQL", "Docker", "AWS"].map((tech) => (
            <div key={tech} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300">
              <div className="font-semibold text-lg text-slate-300">{tech}</div>
            </div>
          ))}
        </div>
      </Section>
      
      {/* Footer */}
      <footer className="py-12 text-center text-slate-500 text-sm border-t border-white/5">
        <p>© {new Date().getFullYear()} Sabbir Islam Alvi. All rights reserved.</p>
      </footer>
    </div>
  );
};

// --- Photographer Portfolio ---

const PhotographerPortfolio = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
       {/* Nav */}
       <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Camera className="w-4 h-4 text-black" />
            </div>
            <span className="font-medium tracking-widest uppercase text-sm">Sabbir Islam Alvi</span>
          </div>
          <div className="flex items-center gap-6">
             <button onClick={onBack} className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                Back to Main
             </button>
             <Button variant="glass" className="px-5 py-2 text-xs uppercase tracking-widest">Book Now</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
           <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="text-5xl md:text-9xl font-serif italic tracking-tighter mb-6"
          >
            Captured Moments
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-lg md:text-xl text-white/80 max-w-lg font-light tracking-wide"
          >
            A visual journey through events, portraits, and the unseen beauty of the world.
          </motion.p>
        </div>
      </div>

      {/* Gallery Grid */}
      <Section>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
           {[
             { src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop", title: "Corporate Event", cat: "Events", height: "h-[400px]" },
             { src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop", title: "Portrait Session", cat: "Portrait", height: "h-[500px]" },
             { src: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop", title: "Urban Life", cat: "Street", height: "h-[350px]" },
             { src: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=800&auto=format&fit=crop", title: "City Lights", cat: "Landscape", height: "h-[450px]" },
             { src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop", title: "Concert Night", cat: "Events", height: "h-[600px]" },
             { src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop", title: "Studio Headshot", cat: "Portrait", height: "h-[400px]" },
             { src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop", title: "Nature's Calm", cat: "Landscape", height: "h-[550px]" },
             { src: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop", title: "Vintage Camera", cat: "Still Life", height: "h-[300px]" },
           ].map((item, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.1 }}
               whileHover={{ scale: 1.02 }}
               className={cn("group relative overflow-hidden rounded-2xl bg-slate-900 cursor-pointer break-inside-avoid mb-6", item.height)}
             >
               <img src={item.src} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                 <p className="text-orange-400 text-xs uppercase tracking-widest mb-1 font-bold">{item.cat}</p>
                 <h3 className="text-xl font-medium text-white">{item.title}</h3>
               </div>
             </motion.div>
           ))}
        </div>
      </Section>

      {/* Achievements / Events List */}
      <Section className="bg-neutral-900 rounded-3xl my-12 mx-4 md:mx-12 max-w-[calc(100%-2rem)] md:max-w-[calc(100%-6rem)]">
        <div className="flex flex-col md:flex-row gap-12 items-start">
          <div className="md:w-1/3">
            <h2 className="text-4xl font-serif italic mb-6">Achievements & <br/>Events</h2>
            <p className="text-neutral-400">A timeline of my professional journey in photography, including exhibitions, awards, and major coverage.</p>
          </div>
          <div className="md:w-2/3 space-y-8 w-full">
            {[
              { year: "2025", title: "Best Portrait Photographer", org: "National Arts Awards", desc: "Awarded for the 'Faces of the City' series." },
              { year: "2024", title: "Official Event Photographer", org: "Tech Summit Global", desc: "Covered the 3-day international conference in San Francisco." },
              { year: "2023", title: "Solo Exhibition: 'Urban Decay'", org: "Modern Art Gallery", desc: "A month-long showcase of street photography." },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 border-b border-white/10 pb-8 last:border-0">
                <span className="text-orange-500 font-mono text-lg">{item.year}</span>
                <div>
                  <h3 className="text-xl font-medium mb-2">{item.title}</h3>
                  <p className="text-sm text-neutral-400 uppercase tracking-wider mb-2">{item.org}</p>
                  <p className="text-neutral-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <footer className="py-12 text-center text-neutral-600 text-sm">
        <div className="flex justify-center gap-6 mb-8">
           <Instagram className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
           <Mail className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
        </div>
        <p>© {new Date().getFullYear()} Sabbir Islam Alvi Photography.</p>
      </footer>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<Mode>("main");

  return (
    <main>
      {mode === "main" && <MainPortfolio onSwitchMode={() => setMode("photographer")} />}
      {mode === "photographer" && <PhotographerPortfolio onBack={() => setMode("main")} />}
    </main>
  );
}
