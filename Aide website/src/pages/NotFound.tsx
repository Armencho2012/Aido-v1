import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

type Language = 'en' | 'ru' | 'hy' | 'ko';

const uiLabels = {
  en: {
    title: '404',
    message: 'Oops! Page not found',
    returnHome: 'Return to Home'
  },
  ru: {
    title: '404',
    message: 'Ой! Страница не найдена',
    returnHome: 'Вернуться на главную'
  },
  hy: {
    title: '404',
    message: 'Ուփս: Էջը չի գտնվել',
    returnHome: 'Վերադառնալ գլխավոր էջ'
  },
  ko: {
    title: '404',
    message: '앗! 페이지를 찾을 수 없습니다',
    returnHome: '홈으로 돌아가기'
  }
};

const NotFound = () => {
  const location = useLocation();
  const { language } = useSettings();
  const labels = uiLabels[language as Language] || uiLabels.en;

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{labels.title}</h1>
        <p className="mb-4 text-xl text-gray-600">{labels.message}</p>
        <Link to="/" className="text-blue-500 underline hover:text-blue-700">
          {labels.returnHome}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
