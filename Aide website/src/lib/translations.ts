export type Language = 'en' | 'ru' | 'hy' | 'ko';

export type TranslationKey =
    | 'welcome'
    | 'sendMessage'
    | 'search'
    | 'settings'
    | 'visualize'
    | 'mastery'
    | 'upload'
    | 'error'
    | 'success'
    | 'title'
    | 'interfaceLanguage'
    | 'theme'
    | 'light'
    | 'dark'
    | 'accountStatus'
    | 'freeTier'
    | 'proPlan'
    | 'classPlan'
    | 'loading'
    | 'deleteAccount'
    | 'deleteConfirmTitle'
    | 'deleteConfirmDescription'
    | 'deleteConfirmButton'
    | 'cancel'
    | 'deleting'
    | 'accountDeletedTitle'
    | 'accountDeletedDescription';

export const translations: Record<Language, Record<TranslationKey, string>> = {
    en: {
        welcome: "Welcome",
        sendMessage: "Send a message...",
        search: "Search...",
        settings: "Settings",
        visualize: "Visualize",
        mastery: "Mastery",
        upload: "Upload",
        error: "Error",
        success: "Success",
        title: "Settings",
        interfaceLanguage: "Interface Language",
        theme: "Theme",
        light: "Light",
        dark: "Dark",
        accountStatus: "Account Status",
        freeTier: "Free Tier",
        proPlan: "Pro Plan",
        classPlan: "Class Plan",
        loading: "Loading...",
        deleteAccount: "Delete Account",
        deleteConfirmTitle: "Delete Account",
        deleteConfirmDescription: "Are you sure you want to delete your account? This action cannot be undone. All your data, including your profile and usage history, will be permanently deleted.",
        deleteConfirmButton: "Delete Account",
        cancel: "Cancel",
        deleting: "Deleting...",
        accountDeletedTitle: "Account Deleted",
        accountDeletedDescription: "Your account has been successfully deleted."
    },
    ru: {
        welcome: "Добро пожаловать",
        sendMessage: "Отправить сообщение...",
        search: "Поиск...",
        settings: "Настройки",
        visualize: "Визуализация",
        mastery: "Мастерство",
        upload: "Загрузить",
        error: "Ошибка",
        success: "Успешно",
        title: "Настройки",
        interfaceLanguage: "Язык интерфейса",
        theme: "Тема",
        light: "Светлая",
        dark: "Темная",
        accountStatus: "Статус аккаунта",
        freeTier: "Бесплатный тариф",
        proPlan: "Тариф Pro",
        classPlan: "Тариф Class",
        loading: "Загрузка...",
        deleteAccount: "Удалить аккаунт",
        deleteConfirmTitle: "Удалить аккаунт",
        deleteConfirmDescription: "Вы уверены, что хотите удалить свой аккаунт? Это действие нельзя отменить. Все ваши данные, включая профиль и историю использования, будут безвозвратно удалены.",
        deleteConfirmButton: "Удалить аккаунт",
        cancel: "Отмена",
        deleting: "Удаление...",
        accountDeletedTitle: "Аккаунт удален",
        accountDeletedDescription: "Ваш аккаунт был успешно удален."
    },
    hy: {
        welcome: "Բարի գալուստ",
        sendMessage: "Ուղարկել հաղորդագրություն...",
        search: "Որոնել...",
        settings: "Կարգավորումներ",
        visualize: "Վիզուալիզացիա",
        mastery: "Վարպետություն",
        upload: "Բեռնել",
        error: "Սխալ",
        success: "Հաջողվեց",
        title: "Կարգավորումներ",
        interfaceLanguage: "Ինտերֆեյսի լեզու",
        theme: "Թեմա",
        light: "Լուսավոր",
        dark: "Մուգ",
        accountStatus: "Հաշվի կարգավիճակ",
        freeTier: "Անվճար տարբերակ",
        proPlan: "Pro պլան",
        classPlan: "Class պլան",
        loading: "Բեռնվում է...",
        deleteAccount: "Ջնջել հաշիվը",
        deleteConfirmTitle: "Ջնջել հաշիվը",
        deleteConfirmDescription: "Դուք համոզված եք, որ ցանկանում եք ջնջել ձեր հաշիվը: Այս գործողությունը չի կարող հետարկվել: Ձեր բոլոր տվյալները, ներառյալ ձեր պրոֆիլը և օգտագործման պատմությունը, կմշտապես ջնջվեն:",
        deleteConfirmButton: "Ջնջել հաշիվը",
        cancel: "Չեղարկել",
        deleting: "Ջնջվում է...",
        accountDeletedTitle: "Հաշիվը ջնջված է",
        accountDeletedDescription: "Ձեր հաշիվը հաջողությամբ ջնջվել է:"
    },
    ko: {
        welcome: "환영합니다",
        sendMessage: "메시지 보내기...",
        search: "검색...",
        settings: "설정",
        visualize: "시각화",
        mastery: "숙련도",
        upload: "업로드",
        error: "오류",
        success: "성공",
        title: "설정",
        interfaceLanguage: "인터페이스 언어",
        theme: "테마",
        light: "라이트",
        dark: "다크",
        accountStatus: "계정 상태",
        freeTier: "무료 요금제",
        proPlan: "프로 요금제",
        classPlan: "클래스 요금제",
        loading: "로딩 중...",
        deleteAccount: "계정 삭제",
        deleteConfirmTitle: "계정 삭제",
        deleteConfirmDescription: "계정을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다. 프로필 및 사용 기록을 포함한 모든 데이터가 영구적으로 삭제됩니다.",
        deleteConfirmButton: "계정 삭제",
        cancel: "취소",
        deleting: "삭제 중...",
        accountDeletedTitle: "계정이 삭제되었습니다",
        accountDeletedDescription: "계정이 성공적으로 삭제되었습니다."
    }
};
