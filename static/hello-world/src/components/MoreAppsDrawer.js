import React from 'react';
import { ExternalLink, Store } from 'lucide-react';
import {  router } from '@forge/bridge';
import { Button } from './ui/button';

export function MoreAppsDrawer({ content }) {

  const handleMarketplaceClick = () => {
    // Replace with your actual Forge marketplace URL
    // You can customize this URL to point to your company's marketplace page
    const marketplaceUrl = 'https://marketplace.atlassian.com/vendors/398573336/clovity';
    router.open(marketplaceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      {/* Marketplace Button */}
      <div className="text-center pt-4">
        <Button 
          onClick={handleMarketplaceClick}
          className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:text-white shadow-lg hover:shadow-xl transition-all duration-200 py-6 text-base font-medium"
        >
          <Store className="h-5 w-5" />
          Visit Our Marketplace
          <ExternalLink className="h-5 w-5" />
        </Button>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-slate-200">
        <p className="text-xs text-center text-slate-500">
          {content?.moreApps?.footer || 'All apps are built with ❤️ by our team'}
        </p>
      </div>
    </div>
  );
}