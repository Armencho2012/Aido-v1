import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: 'en' | 'ru' | 'hy' | 'ko';
}

const labels = {
  en: {
    title: "You've reached your daily limit",
    subtitle: "Unlock unlimited neural mapping and deep analysis with Aide Pro",
    features: [
      "Unlimited AI-powered analyses",
      "Advanced Neural Knowledge Maps",
      "Priority processing speed",
      "Unlimited content archive"
    ],
    cta: "Upgrade to Pro",
    maybeLater: "Maybe Later"
  },
  ru: {
    title: "Вы достигли дневного лимита",
    subtitle: "Разблокируйте неограниченное нейронное картирование и глубокий анализ с Aide Pro",
    features: [
      "Неограниченные анализы на основе ИИ",
      "Расширенные нейронные карты знаний",
      "Приоритетная скорость обработки",
      "Неограниченный архив контента"
    ],
    cta: "Перейти на Pro",
    maybeLater: "Позже"
  },
  hy: {
    title: "Դուք հասել եք ձեր օրական սահմանաչափին",
    subtitle: "Բացեք անսահմանափակ նեյրոնային քարտեզագրում և խորը վերլուծություն Aide Pro-ի միջոցով",
    features: [
      "Անսահմանափակ AI վերլուծություններ",
      "Ընդլայնված Նեյրոնային Գիտելիքների Քարտեզներ",
      "Առաջնահերթ մշակման արագություն",
      "Անսահմանափակ բովանդակության արխիվ"
    ],
    cta: "Թարմացրեք Pro-ի",
    maybeLater: "Գուցե ավելի ուշ"
  },
  ko: {
    title: "일일 한도에 도달했습니다",
    subtitle: "Aide Pro로 무제한 신경망 매핑과 심층 분석을 잠금 해제하세요",
    features: [
      "무제한 AI 기반 분석",
      "고급 신경 지식 맵",
      "우선 처리 속도",
      "무제한 콘텐츠 아카이브"
    ],
    cta: "Pro로 업그레이드",
    maybeLater: "나중에"
  }
};

export const UpgradeModal = ({ open, onOpenChange, language = 'en' }: UpgradeModalProps) => {
  const l = labels[language] || labels.en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 border-2 border-primary/20">
        {/* Premium header with animated gradient */}
        <div className="relative px-6 pt-8 pb-6 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
              <Crown className="h-8 w-8 text-primary-foreground" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {l.title}
              </DialogTitle>
              <DialogDescription className="text-base mt-2 text-foreground/80">
                {l.subtitle}
              </DialogDescription>
            </DialogHeader>
          </motion.div>
        </div>

        {/* Features list */}
        <div className="px-6 pb-6 space-y-3">
          {l.features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{feature}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20 text-base font-semibold"
          >
            <Link to="/billing" onClick={() => onOpenChange(false)}>
              <Sparkles className="mr-2 h-5 w-5" />
              {l.cta}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            {l.maybeLater}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
