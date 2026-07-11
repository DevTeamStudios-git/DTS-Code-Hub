import { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.repositories': 'Repositories',
    'nav.issues': 'Issues',
    'nav.pullRequests': 'Pull Requests',
    'nav.wiki': 'Wiki',
    'nav.signIn': 'Sign In',
    'nav.signUp': 'Sign Up',
    'nav.search': 'Search repositories, users...',
    'nav.yourProfile': 'Your Profile',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign Out',
    'nav.newRepo': 'New Repository',
    // Hero
    'hero.title': 'Build • Collaborate • Innovate',
    'hero.subtitle': 'A powerful code collaboration platform by Developpement Team Studios',
    'hero.getStarted': 'Get Started',
    'hero.explore': 'Explore',
    // Auth
    'auth.signIn': 'Sign in to DTS Code Hub',
    'auth.signUp': 'Join DTS Code Hub',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm password',
    'auth.username': 'Username',
    'auth.forgotPassword': 'Forgot password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.orContinueWith': 'Or continue with',
    'auth.github': 'Continue with GitHub',
    'auth.google': 'Continue with Google',
    'auth.resetPassword': 'Reset your password',
    'auth.resetPasswordDesc': "Enter your email and we'll send you a reset link.",
    'auth.sendResetLink': 'Send reset link',
    'auth.backToSignIn': 'Back to sign in',
    'auth.newPassword': 'New password',
    'auth.updatePassword': 'Update password',
    'auth.twoFactor': 'Two-factor authentication',
    'auth.twoFactorDesc': 'Enter the 6-digit code from your authenticator app.',
    'auth.verify': 'Verify',
    // Profile
    'profile.repositories': 'Repositories',
    'profile.stars': 'Stars',
    'profile.followers': 'Followers',
    'profile.following': 'Following',
    'profile.editProfile': 'Edit profile',
    'profile.follow': 'Follow',
    'profile.unfollow': 'Unfollow',
    'profile.contributions': 'contributions in the last year',
    'profile.noReadme': 'Add a README to your profile',
    'profile.noRepos': 'No repositories yet',
    'profile.pinnedRepos': 'Pinned',
    'profile.popularRepos': 'Popular repositories',
    // Settings
    'settings.profile': 'Profile',
    'settings.security': 'Security',
    'settings.sshKeys': 'SSH Keys',
    'settings.gpgKeys': 'GPG Keys',
    'settings.tokens': 'Access Tokens',
    'settings.oauthApps': 'OAuth Apps',
    'settings.displayName': 'Display name',
    'settings.bio': 'Bio',
    'settings.location': 'Location',
    'settings.website': 'Website',
    'settings.company': 'Company',
    'settings.saveChanges': 'Save changes',
    'settings.twoFactor': 'Two-factor authentication',
    'settings.twoFactorEnabled': '2FA is enabled',
    'settings.twoFactorDisabled': '2FA is not enabled',
    'settings.enable2FA': 'Enable 2FA',
    'settings.disable2FA': 'Disable 2FA',
    'settings.addSSHKey': 'Add SSH key',
    'settings.addGPGKey': 'Add GPG key',
    'settings.newToken': 'Generate new token',
    'settings.title': 'Title',
    'settings.key': 'Key',
    'settings.fingerprint': 'Fingerprint',
    'settings.addedOn': 'Added',
    'settings.delete': 'Delete',
    'settings.noKeys': 'No keys added yet',
    'settings.tokenName': 'Token name',
    'settings.scopes': 'Scopes',
    'settings.expiration': 'Expiration',
    'settings.generate': 'Generate token',
    'settings.copyToken': 'Copy token',
    'settings.tokenWarning': 'Make sure to copy your token now. You won\'t be able to see it again.',
    'settings.revokeToken': 'Revoke',
    'settings.noTokens': 'No personal access tokens yet',
    'settings.never': 'Never',
    'settings.lastUsed': 'Last used',
    'settings.uploadAvatar': 'Upload avatar',
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success!',
    'common.noResults': 'No results found',
    'common.public': 'Public',
    'common.private': 'Private',
    // Badges
    'badge.first_commit': 'First Commit',
    'badge.early_adopter': 'Early Adopter',
    'badge.star_collector': 'Star Collector',
    'badge.popular': 'Popular',
    'badge.contributor': 'Contributor',
    'badge.prolific': 'Prolific',
    'badge.open_sourcerer': 'Open Sourcerer',
    'badge.streak_7': 'Weekly Warrior',
    'badge.streak_30': 'Monthly Champion',
  },
  fr: {
    // Nav
    'nav.home': 'Accueil',
    'nav.explore': 'Explorer',
    'nav.repositories': 'Dépôts',
    'nav.issues': 'Tickets',
    'nav.pullRequests': 'Pull Requests',
    'nav.wiki': 'Wiki',
    'nav.signIn': 'Connexion',
    'nav.signUp': 'Inscription',
    'nav.search': 'Rechercher des dépôts, utilisateurs...',
    'nav.yourProfile': 'Votre profil',
    'nav.settings': 'Paramètres',
    'nav.signOut': 'Déconnexion',
    'nav.newRepo': 'Nouveau dépôt',
    // Hero
    'hero.title': 'Construire • Collaborer • Innover',
    'hero.subtitle': 'Une plateforme de collaboration de code par Developpement Team Studios',
    'hero.getStarted': 'Commencer',
    'hero.explore': 'Explorer',
    // Auth
    'auth.signIn': 'Connexion à DTS Code Hub',
    'auth.signUp': 'Rejoindre DTS Code Hub',
    'auth.email': 'Adresse e-mail',
    'auth.password': 'Mot de passe',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.username': "Nom d'utilisateur",
    'auth.forgotPassword': 'Mot de passe oublié ?',
    'auth.noAccount': 'Pas encore de compte ?',
    'auth.hasAccount': 'Déjà un compte ?',
    'auth.orContinueWith': 'Ou continuer avec',
    'auth.github': 'Continuer avec GitHub',
    'auth.google': 'Continuer avec Google',
    'auth.resetPassword': 'Réinitialiser votre mot de passe',
    'auth.resetPasswordDesc': "Entrez votre e-mail et nous vous enverrons un lien de réinitialisation.",
    'auth.sendResetLink': 'Envoyer le lien',
    'auth.backToSignIn': 'Retour à la connexion',
    'auth.newPassword': 'Nouveau mot de passe',
    'auth.updatePassword': 'Mettre à jour le mot de passe',
    'auth.twoFactor': 'Authentification à deux facteurs',
    'auth.twoFactorDesc': "Entrez le code à 6 chiffres de votre application d'authentification.",
    'auth.verify': 'Vérifier',
    // Profile
    'profile.repositories': 'Dépôts',
    'profile.stars': 'Étoiles',
    'profile.followers': 'Abonnés',
    'profile.following': 'Abonnements',
    'profile.editProfile': 'Modifier le profil',
    'profile.follow': 'Suivre',
    'profile.unfollow': 'Ne plus suivre',
    'profile.contributions': 'contributions cette dernière année',
    'profile.noReadme': 'Ajoutez un README à votre profil',
    'profile.noRepos': 'Aucun dépôt pour l\'instant',
    'profile.pinnedRepos': 'Épinglés',
    'profile.popularRepos': 'Dépôts populaires',
    // Settings
    'settings.profile': 'Profil',
    'settings.security': 'Sécurité',
    'settings.sshKeys': 'Clés SSH',
    'settings.gpgKeys': 'Clés GPG',
    'settings.tokens': "Jetons d'accès",
    'settings.oauthApps': 'Applications OAuth',
    'settings.displayName': "Nom d'affichage",
    'settings.bio': 'Bio',
    'settings.location': 'Localisation',
    'settings.website': 'Site web',
    'settings.company': 'Entreprise',
    'settings.saveChanges': 'Sauvegarder',
    'settings.twoFactor': 'Authentification à deux facteurs',
    'settings.twoFactorEnabled': '2FA activée',
    'settings.twoFactorDisabled': '2FA non activée',
    'settings.enable2FA': 'Activer la 2FA',
    'settings.disable2FA': 'Désactiver la 2FA',
    'settings.addSSHKey': 'Ajouter une clé SSH',
    'settings.addGPGKey': 'Ajouter une clé GPG',
    'settings.newToken': 'Générer un nouveau jeton',
    'settings.title': 'Titre',
    'settings.key': 'Clé',
    'settings.fingerprint': 'Empreinte',
    'settings.addedOn': 'Ajouté le',
    'settings.delete': 'Supprimer',
    'settings.noKeys': 'Aucune clé ajoutée',
    'settings.tokenName': 'Nom du jeton',
    'settings.scopes': 'Portées',
    'settings.expiration': 'Expiration',
    'settings.generate': 'Générer le jeton',
    'settings.copyToken': 'Copier le jeton',
    'settings.tokenWarning': "Copiez votre jeton maintenant. Vous ne pourrez plus le voir.",
    'settings.revokeToken': 'Révoquer',
    'settings.noTokens': "Aucun jeton d'accès personnel",
    'settings.never': 'Jamais',
    'settings.lastUsed': 'Dernière utilisation',
    'settings.uploadAvatar': 'Télécharger un avatar',
    // Common
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.add': 'Ajouter',
    'common.copy': 'Copier',
    'common.copied': 'Copié !',
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.success': 'Succès !',
    'common.noResults': 'Aucun résultat',
    'common.public': 'Public',
    'common.private': 'Privé',
    // Badges
    'badge.first_commit': 'Premier commit',
    'badge.early_adopter': 'Primo-adoptant',
    'badge.star_collector': 'Collectionneur',
    'badge.popular': 'Populaire',
    'badge.contributor': 'Contributeur',
    'badge.prolific': 'Prolifique',
    'badge.open_sourcerer': 'Open Sorcier',
    'badge.streak_7': 'Guerrier hebdo',
    'badge.streak_30': 'Champion mensuel',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('dts-lang') as Language) ?? 'en';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('dts-lang', lang);
  };

  const t = (key: string): string => translations[language][key] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}
