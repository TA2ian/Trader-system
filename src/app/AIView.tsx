import React, { useState } from "react";
import { Bot, Sparkles, BrainCircuit, BarChart3, MessageSquareText, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";

export function AIView() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async (type: string) => {
    setLoading(true);
    setAnalysis(null);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type, 
          data: { 
            message: "طلب تحليل عام للوضع المالي الحالي بناءً على السوق السوري" 
          } 
        }),
      });
      const data = await response.json();
      setAnalysis(data.result);
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysis("عذراً، حدث خطأ أثناء الاتصال بمركز الذكاء الاصطناعي.");
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    { 
      id: "credit",
      title: "تحليل مخاطر الائتمان", 
      desc: "استخدام الذكاء الاصطناعي لتقييم قدرة العميل على السداد بناءً على تاريخه.",
      icon: <BrainCircuit className="w-6 h-6" />,
      color: "text-purple-400",
      bg: "bg-purple-500/10"
    },
    { 
      id: "market",
      title: "تنبؤات السوق", 
      desc: "توقع أسعار الصرف والسلع في السوق السورية للأسبوع القادم.",
      icon: <Sparkles className="w-6 h-6" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10"
    },
    { 
      id: "report",
      title: "تقارير ذكية", 
      desc: "تنشيط تقرير تلقائي يلخص وضع الديون والمخزون بضغطة واحدة.",
      icon: <BarChart3 className="w-6 h-6" />,
      color: "text-amber-400",
      bg: "bg-amber-500/10"
    },
    { 
      id: "assistant",
      title: "مساعد التاجر", 
      desc: "دردشة ذكية للإجابة على استفساراتك المالية والمحاسبية.",
      icon: <MessageSquareText className="w-6 h-6" />,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10"
    }
  ];

  return (
    <div className="p-3 md:p-6 pb-20">
      <header className="mb-8 text-right">
        <div className="flex justify-end mb-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Bot className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-white mb-1.5 leading-tight">مركز الذكاء الاصطناعي</h1>
        <p className="text-white/40 max-w-2xl ml-auto text-xs">أدوات متقدمة لمساعدتك في اتخاذ قرارات تجارية أفضل باستخدام أحدث موديلات Gemini الذكية.</p>
      </header>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 p-6 frosted-glass rounded-2xl border border-indigo-500/30 text-right relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
            <div className="flex items-center justify-end gap-2 mb-4 text-indigo-400">
              <span className="text-sm font-bold">تقرير Gemini الذكي</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed font-sans text-right dir-rtl">
              <Markdown>{analysis}</Markdown>
            </div>
            <button 
              onClick={() => setAnalysis(null)}
              className="mt-6 text-[10px] text-white/20 hover:text-white transition-colors"
            >
              إغلاق هذا التقرير
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => !loading && runAnalysis(tool.id)}
            className="p-5 frosted-glass rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group cursor-pointer active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-1 px-2 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Send className="w-3 h-3 text-indigo-400" />
              </div>
              <div className={`w-10 h-10 ${tool.bg} ${tool.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : React.cloneElement(tool.icon as React.ReactElement<any>, { className: "w-5 h-5" })}
              </div>
            </div>
            <h3 className="text-base font-bold mb-2 text-right">{tool.title}</h3>
            <p className="text-xs text-white/40 leading-relaxed text-right">{tool.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
