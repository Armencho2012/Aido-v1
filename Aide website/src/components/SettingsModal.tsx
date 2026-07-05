import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/lib/settings";
import { useUsageLimit } from "@/hooks/useUsageLimit";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  showPlanStatus?: boolean;
  showDeleteAccount?: boolean;
}

export const SettingsModal = ({
  open,
  onOpenChange,
  language: propLanguage,
  onLanguageChange: propOnLanguageChange,
  theme,
  onThemeChange,
  showPlanStatus = true,
  showDeleteAccount = true
}: SettingsModalProps) => {
  const { t, language: hookLanguage, setLanguage: hookSetLanguage } = useTranslation();

  // Use props if provided (legacy support), otherwise use hook
  const currentLanguage = propLanguage || hookLanguage;
  const setLanguage = propOnLanguageChange || hookSetLanguage;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { userPlan, isLoading: planLoading, refreshUsage } = useUsageLimit();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: t('error'),
          description: "No active session found",
          variant: "destructive"
        });
        setIsDeleting(false);
        return;
      }

      // Call the edge function to delete the account
      console.log('Calling delete-account function...');
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {}
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Delete account error:', error);

        // Check for specific error types
        let errorMessage = 'Failed to delete account';

        if (error.message) {
          const msg = error.message.toLowerCase();
          if (msg.includes('not found') || msg.includes('404') || msg.includes('function')) {
            errorMessage = 'Delete account function is not deployed.';
          } else if (msg.includes('unauthorized') || msg.includes('401')) {
            errorMessage = 'Unauthorized. Please try logging out and back in.';
          } else if (msg.includes('server') || msg.includes('500')) {
            errorMessage = 'Server error. Check Supabase function logs.';
          } else {
            errorMessage = error.message;
          }
        } else if (error.name) {
          errorMessage = `${error.name}: ${error.message || 'Unknown error'}`;
        }

        throw new Error(errorMessage);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Account deletion failed');
      }

      // Sign out and navigate to home
      await supabase.auth.signOut();

      toast({
        title: t('accountDeletedTitle'),
        description: t('accountDeletedDescription'),
      });

      navigate("/");
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: t('error'),
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive"
      });
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        refreshUsage(session.user.id);
      }
    });
  }, [open, refreshUsage]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription className="sr-only">
              Change your language, theme, and account preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>{t('interfaceLanguage')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={currentLanguage === 'en' ? 'default' : 'outline'}
                  onClick={() => setLanguage('en')}
                  className="flex-1"
                >
                  English
                </Button>
                <Button
                  variant={currentLanguage === 'ru' ? 'default' : 'outline'}
                  onClick={() => setLanguage('ru')}
                  className="flex-1"
                >
                  Русский
                </Button>
                <Button
                  variant={currentLanguage === 'hy' ? 'default' : 'outline'}
                  onClick={() => setLanguage('hy')}
                  className="flex-1"
                >
                  Հայերեն
                </Button>
                <Button
                  variant={currentLanguage === 'ko' ? 'default' : 'outline'}
                  onClick={() => setLanguage('ko')}
                  className="flex-1"
                >
                  한국어
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t('theme')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => onThemeChange('light')}
                  className="flex-1"
                >
                  {t('light')}
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => onThemeChange('dark')}
                  className="flex-1"
                >
                  {t('dark')}
                </Button>
              </div>
            </div>

            {showPlanStatus && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-muted-foreground">{t('accountStatus')}</Label>
                <p className="text-sm font-medium">
                  {planLoading
                    ? t('loading')
                    : userPlan === 'pro'
                      ? t('proPlan')
                      : userPlan === 'class'
                        ? t('classPlan')
                        : t('freeTier')}
                </p>
              </div>
            )}

            {showDeleteAccount && (
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('deleteAccount')}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showDeleteAccount && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('deleting')}
                  </>
                ) : (
                  t('deleteConfirmButton')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
