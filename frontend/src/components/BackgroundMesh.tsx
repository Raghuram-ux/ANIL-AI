"use client";

export default function BackgroundMesh() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[var(--background)] transition-colors duration-700">
      {/* Indigo Blob */}
      <div 
        className="mesh-blob w-[500px] h-[500px] bg-indigo-500/30 -top-24 -left-24 [animation:mesh-float-1_25s_infinite_ease-in-out]"
      ></div>
      
      {/* Violet Blob */}
      <div 
        className="mesh-blob w-[600px] h-[600px] bg-violet-600/20 top-1/4 -right-24 [animation:mesh-float-2_30s_infinite_ease-in-out_reverse]"
      ></div>
      
      {/* Emerald Blob */}
      <div 
        className="mesh-blob w-[450px] h-[450px] bg-emerald-500/20 -bottom-24 left-1/3 [animation:mesh-float-3_22s_infinite_ease-in-out]"
      ></div>
      
      {/* Brand Blue Blob */}
      <div 
        className="mesh-blob w-[400px] h-[400px] bg-blue-600/30 top-1/2 left-10 [animation:mesh-float-1_28s_infinite_ease-in-out_2s]"
      ></div>

      {/* Brand Amber Blob */}
      <div 
        className="mesh-blob w-[550px] h-[550px] bg-amber-500/20 bottom-10 -right-10 [animation:mesh-float-2_35s_infinite_ease-in-out_1s]"
      ></div>
    </div>
  );
}
