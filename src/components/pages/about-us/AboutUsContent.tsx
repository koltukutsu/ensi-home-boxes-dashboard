'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { 
  Lightbulb, 
  Brain, 
  Heart, 
  Zap, 
  Leaf, 
  Code, 
  Rocket, 
  Globe 
} from 'lucide-react';
import { usePageViewAnalytics } from '@/hooks/usePageViewAnalytics';

// Define the sectors with their icons
const sectorIcons = [
  { name: 'Tech', icon: <Code className="h-4 w-4" /> },
  { name: 'AI', icon: <Brain className="h-4 w-4" /> },
  { name: 'Health', icon: <Heart className="h-4 w-4" /> },
  { name: 'Energy', icon: <Zap className="h-4 w-4" /> },
  { name: 'Sustainability', icon: <Leaf className="h-4 w-4" /> },
  { name: 'Innovation', icon: <Lightbulb className="h-4 w-4" /> },
  { name: 'Growth', icon: <Rocket className="h-4 w-4" /> },
  { name: 'Global', icon: <Globe className="h-4 w-4" /> },
];

export function AboutUsContent() {
  // Initialize analytics tracking for this page
  usePageViewAnalytics({
    pageName: 'About Us',
    pageCategory: 'company',
    additionalParams: {
      page_section: 'about'
    }
  });

  const octopusRef = useRef<HTMLDivElement>(null);
  const isOctopusInView = useInView(octopusRef, { once: true, amount: 0.3 });
  const heroRef = useRef<HTMLDivElement>(null);
  const isHeroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const philosophyRef = useRef<HTMLDivElement>(null);
  const isPhilosophyInView = useInView(philosophyRef, { once: true, amount: 0.3 });
  const controls = useAnimation();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  // Update window size on resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    // Set initial size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (isOctopusInView) {
      controls.start('visible');
    }
  }, [isOctopusInView, controls]);

  // Generate path for a tentacle using cubic bezier curves - modified for better mobile responsiveness
  const generateTentaclePath = (angle: number, containerSize: number) => {
    const center = containerSize / 2;
    // Reduce radius on mobile screens to prevent overflow
    const radiusMultiplier = windowSize.width < 640 ? 0.35 : 
                            windowSize.width < 768 ? 0.4 : 0.45;
    const radius = containerSize * radiusMultiplier;
    
    // Calculate end point
    const endX = center + radius * Math.cos(angle);
    const endY = center + radius * Math.sin(angle);
    
    // Control points for bezier curve to create undulating tentacle shape
    // Also adjust control points for screen size
    const cp1Dist = radius * (windowSize.width < 640 ? 0.3 : 0.4);
    const cp2Dist = radius * (windowSize.width < 640 ? 0.6 : 0.7);
    
    // Control point 1
    const cp1x = center + cp1Dist * Math.cos(angle + 0.2);
    const cp1y = center + cp1Dist * Math.sin(angle + 0.2);
    
    // Control point 2
    const cp2x = center + cp2Dist * Math.cos(angle - 0.2);
    const cp2y = center + cp2Dist * Math.sin(angle - 0.2);
    
    return `M ${center} ${center} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
  };

  // Generate smaller curves for suction cups - also adjusted for mobile
  const generateSuctionCups = (angle: number, containerSize: number, count: number) => {
    const center = containerSize / 2;
    // Use the same radius multiplier for consistency
    const radiusMultiplier = windowSize.width < 640 ? 0.35 : 
                             windowSize.width < 768 ? 0.4 : 0.45;
    const radius = containerSize * radiusMultiplier;
    const cups = [];
    
    // Fewer suction cups on mobile for better visibility
    const mobileCount = windowSize.width < 640 ? 3 : count;
    
    for (let i = 1; i <= mobileCount; i++) {
      const distance = (radius * i) / (mobileCount + 1);
      const position = {
        x: center + distance * Math.cos(angle),
        y: center + distance * Math.sin(angle)
      };
      
      cups.push(position);
    }
    
    return cups;
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section with Parallax Effect */}
      <section 
        ref={heroRef}
        className="relative py-16 md:py-24 overflow-hidden"
      >
        <motion.div 
          className="absolute inset-0 bg-primary/5 -z-10"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 1 }}
        />
        
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
                About Ochtarcus
              </h1>
              
              <p className="text-xl md:text-2xl text-foreground/80 mb-8">
                Decentralized innovation, unified intelligence
              </p>
              
              <motion.div
                className="inline-block"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <span className="px-6 py-3 bg-primary/10 rounded-full text-primary text-lg md:text-xl font-medium">
                  Many arms, one mind
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Visual Octopus Representation */}
      <section 
        ref={octopusRef}
        className="py-12 md:py-20 bg-gradient-to-b from-background to-background/95"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto aspect-square relative overflow-visible">
            {/* SVG Container for advanced octopus visualization */}
            <svg 
              viewBox="0 0 600 600" 
              className="w-full h-full"
              style={{ 
                filter: "drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.15))",
                overflow: "visible"
              }}
            >
              {/* Center Brain with pulsing animation */}
              <motion.g
                initial={{ scale: 0.5, opacity: 0 }}
                animate={isOctopusInView ? 
                  { 
                    scale: [1, 1.05, 1], 
                    opacity: 1 
                  } : {}}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatType: "reverse"
                }}
              >
                <circle cx="300" cy="300" r="60" fill="var(--primary)" opacity="0.2" />
                <circle cx="300" cy="300" r="45" fill="var(--primary)" opacity="0.3" />
                <circle cx="300" cy="300" r="30" fill="var(--primary)" />
                <text x="300" y="308" textAnchor="middle" fill="var(--primary-foreground)" fontWeight="bold" fontSize="24">O</text>
              </motion.g>
              
              {/* Tentacles - organic curved paths */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * Math.PI / 4); // 8 tentacles evenly spaced
                const tentaclePath = generateTentaclePath(angle, 600);
                
                return (
                  <motion.g key={`tentacle-${i}`}>
                    {/* Main tentacle path */}
                    <motion.path
                      d={tentaclePath}
                      fill="none"
                      strokeWidth={windowSize.width < 640 ? 4 : windowSize.width < 768 ? 5 : 8}
                      stroke="var(--primary)"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0.7 }}
                      animate={isOctopusInView ? 
                        { 
                          pathLength: 1, 
                          opacity: 1,
                          y: [0, Math.sin(i) * 5, 0],
                          x: [0, Math.cos(i) * 5, 0]
                        } : {}}
                      transition={{ 
                        pathLength: { duration: 0.8, delay: 0.1 + (i * 0.1) },
                        y: { duration: 4, repeat: Infinity, repeatType: "reverse", delay: i * 0.5 },
                        x: { duration: 4, repeat: Infinity, repeatType: "reverse", delay: i * 0.5 }
                      }}
                    />
                    
                    {/* Suction cups along tentacle */}
                    {generateSuctionCups(angle, 600, 5).map((cup, cupIndex) => (
                      <motion.circle
                        key={`cup-${i}-${cupIndex}`}
                        cx={cup.x}
                        cy={cup.y}
                        r={windowSize.width < 640 ? 2 : windowSize.width < 768 ? 3 : 5}
                        fill="var(--primary)"
                        opacity={0.6}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={isOctopusInView ? { scale: 1, opacity: 0.6 } : {}}
                        transition={{ 
                          duration: 0.3, 
                          delay: 0.8 + (i * 0.1) + (cupIndex * 0.1) 
                        }}
                      />
                    ))}
                  </motion.g>
                );
              })}
            </svg>
            
            {/* End points representing different sectors - smaller and closer on mobile */}
            {sectorIcons.map((sector, i) => {
              const angle = i * Math.PI / 4;
              // Adjust radius for mobile to prevent overflow
              const radiusMultiplier = windowSize.width < 640 ? 37 : 
                                      windowSize.width < 768 ? 42 : 45;
              
              return (
                <motion.div 
                  key={i} 
                  className={`absolute bg-primary text-primary-foreground rounded-full ${
                    windowSize.width < 640 ? 'px-2 py-0.5 text-xs' : 'px-3 py-1'
                  } flex items-center gap-1 shadow-lg`}
                  style={{
                    top: `${50 + radiusMultiplier * Math.sin(angle)}%`,
                    left: `${50 + radiusMultiplier * Math.cos(angle)}%`,
                    transformOrigin: 'center',
                    transform: 'translate(-50%, -50%)',
                    whiteSpace: 'nowrap',
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isOctopusInView ? { 
                    scale: 1, 
                    opacity: 1,
                    y: [0, Math.sin(i) * (windowSize.width < 640 ? 5 : 10), 0],
                    x: [0, Math.cos(i) * (windowSize.width < 640 ? 5 : 10), 0]
                  } : {}}
                  transition={{ 
                    scale: { duration: 0.4, delay: 0.9 + (i * 0.1) },
                    opacity: { duration: 0.4, delay: 0.9 + (i * 0.1) },
                    y: { duration: 5, repeat: Infinity, repeatType: "reverse", delay: i * 0.5 },
                    x: { duration: 5, repeat: Infinity, repeatType: "reverse", delay: i * 0.5 }
                  }}
                >
                  {sector.icon}
                  <span className={`${windowSize.width < 640 ? 'text-xs' : 'text-xs md:text-sm'} font-medium`}>
                    {windowSize.width < 480 && i % 2 !== 0 ? '' : sector.name}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Name Origin Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-background to-primary/5">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block mr-3">🐙</span> 
              Why the Name Ochtarcus?
            </motion.h2>
            
            <motion.div 
              className="prose prose-lg dark:prose-invert max-w-none bg-card/50 p-6 md:p-8 rounded-2xl shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <p className="text-lg leading-relaxed">
                <strong className="text-primary">Ochtarcus</strong> is derived from classical roots — <em>"octo"</em> (eight) and <em>"archus"</em> (ruler or guide) — and reflects our core philosophy as an incubation hub.
              </p>
              <p className="text-lg leading-relaxed">
                In nature, the octopus is a symbol of intelligence, adaptability, and decentralized control. Each of its eight limbs contains a complex network of neurons, capable of independent action. Yet these limbs remain connected to and guided by a central brain — a unified intelligence that coordinates movement, response, and strategy.
              </p>
              <p className="text-xl font-medium text-primary mt-4">
                We see startups the same way.
              </p>
              <p className="text-lg leading-relaxed">
                At Ochtarcus, each venture we support operates like one of these limbs — with the freedom to explore, build, and adapt. But they are not isolated. They are connected to a larger system — a guiding intelligence that provides context, experience, and long-term vision.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Philosophy Section */}
      <section 
        ref={philosophyRef}
        className="py-16 md:py-24 bg-card/20"
      >
        <div className="container mx-auto px-4 md:px-8">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block mr-3">💡</span> 
            Our Philosophy
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <motion.div 
              className="bg-card rounded-xl p-6 md:p-8 shadow-md border border-border/50 hover:border-primary/30 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-primary">Decentralized Autonomy</h3>
              <p className="text-foreground/80">
                We empower startups to lead their own direction while staying connected to a shared source of guidance.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-card rounded-xl p-6 md:p-8 shadow-md border border-border/50 hover:border-primary/30 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-primary">Strategic Reach</h3>
              <p className="text-foreground/80">
                Like the octopus, we extend into multiple sectors — tech, health, energy, AI, sustainability — with agility and depth.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-card rounded-xl p-6 md:p-8 shadow-md border border-border/50 hover:border-primary/30 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-primary">Unified Intelligence</h3>
              <p className="text-foreground/80">
                Our role is not to control, but to connect — offering resources, insights, and long-term perspective that allow startups to move faster and smarter.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Final Statement */}
      <section className="py-20 md:py-32 bg-gradient-to-t from-background to-primary/5">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            className="max-w-3xl mx-auto bg-card/80 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-lg border border-primary/20"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <motion.div 
              className="text-center"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              viewport={{ once: true }}
            >
              <p className="text-xl md:text-2xl font-medium mb-8">
                At Ochtarcus, we're reimagining the future of innovation —
                <br className="hidden md:block" />
                where independence meets interconnection
              </p>
              
              <div className="space-y-2 md:space-y-4">
                <span className="block text-3xl md:text-4xl font-bold text-primary">
                  Many Arms
                </span>
                <span className="block text-2xl md:text-3xl font-bold text-primary/80">
                  One Vision
                </span>
                <span className="block text-3xl md:text-4xl font-bold text-primary">
                  Infinite Possibilities
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
} 