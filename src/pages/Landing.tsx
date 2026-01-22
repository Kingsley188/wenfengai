import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { 
  Sparkles, 
  Zap, 
  FileText, 
  Palette, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: '一键生成',
    description: '上传资料，AI 自动分析并生成专业 PPT 内容',
  },
  {
    icon: FileText,
    title: '多格式支持',
    description: '支持 PDF、Word、图片、音频等多种格式输入',
  },
  {
    icon: Palette,
    title: '智能排版',
    description: 'AI 自动优化布局，让每一页都赏心悦目',
  },
];

const benefits = [
  '无需设计经验，AI 帮你搞定',
  '节省 90% 的制作时间',
  '专业级排版和配色方案',
  '随时修改，即时预览',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI 驱动的智能创作</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 animate-slide-up tracking-tight">
            高效智能
            <br />
            <span className="gradient-text">PPT 创作平台</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            上传您的资料，让 AI 帮您生成专业精美的演示文稿。
            告别繁琐排版，专注于内容本身。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button 
              size="lg" 
              asChild
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 rounded-xl hover-lift"
            >
              <Link to="/auth?mode=signup">
                免费开始使用
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              asChild
              className="text-lg px-8 py-6 rounded-xl"
            >
              <Link to="/auth">
                登录账户
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            强大功能，简单易用
          </h2>
          <p className="text-muted-foreground text-center mb-16 text-lg">
            三步完成专业 PPT 制作
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="bg-card rounded-2xl p-8 hover-lift border border-border/50 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                为什么选择WinFlow？
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                我们的 AI 引擎经过大量专业演示文稿的训练，
                能够理解您的内容并生成最适合的视觉呈现。
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li 
                    key={index} 
                    className="flex items-center gap-3 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-border/50">
                <div className="text-center p-8">
                  <div className="w-24 h-24 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-12 h-12 text-accent" />
                  </div>
                  <p className="text-2xl font-semibold text-foreground mb-2">AI 智能创作</p>
                  <p className="text-muted-foreground">让创意自由流动</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            准备好开始了吗？
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            立即注册，体验 AI 驱动的高效创作流程
          </p>
          <Button 
            size="lg" 
            asChild
            className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 rounded-xl"
          >
            <Link to="/auth?mode=signup">
              免费注册
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          © 2024 WinFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
