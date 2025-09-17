import { router } from '@forge/bridge';

export function MoreAppsDrawer({ content }) {

  const handleMarketplaceClick = () => {
    // Replace with your actual Forge marketplace URL
    // You can customize this URL to point to your company's marketplace page
    const marketplaceUrl = 'https://marketplace.atlassian.com/vendors/398573336/clovity';
    router.open(marketplaceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500 ">
      {/* Marketplace Button */}
      <div className='text-xl leading-8 mb-8'>
        Explore all our apps on the Atlassian
        Marketplace:
      </div>
      <div className="rounded-[5px] border-[3px] border-[#EEE] bg-white px-4 py-6">
        <div className='text-[28px] font-semibold leading-[41px] mb-5'>
          Our Atlassian Marketplace
          Page
        </div>
        <div className='text-[16px] leading-8'>
          Discover our full Suite of AI-powered
          Jira app in one place
        </div>
        <div className='flex justify-end mt-3'>
          <button
            onClick={handleMarketplaceClick}
            className="flex items-center gap-2 p-1.5 rounded-[3px] border font-medium border-[#D9D9D9] bg-white hover:scale-105"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.1074 11.2471L14.1404 14.3162C13.9961 14.4604 13.8029 14.5401 13.6023 14.5383C13.4018 14.5365 13.2099 14.4533 13.0681 14.3066C12.9263 14.1599 12.8459 13.9614 12.8441 13.754C12.8424 13.5465 12.9195 13.3467 13.0588 13.1975L16.0258 10.1284C16.114 10.0354 16.191 9.93177 16.2553 9.81979C16.2438 9.81979 16.2346 9.82612 16.2232 9.82612L4.22656 9.8008C4.0237 9.8008 3.82915 9.71744 3.6857 9.56906C3.54226 9.42068 3.46167 9.21943 3.46167 9.00959C3.46167 8.79975 3.54226 8.5985 3.6857 8.45012C3.82915 8.30174 4.0237 8.21838 4.22656 8.21838L16.2186 8.2437C16.24 8.2437 16.2576 8.25478 16.2782 8.25636C16.2104 8.12252 16.1244 7.99942 16.0228 7.89082L13.0557 4.82172C12.9827 4.74874 12.9244 4.66143 12.8843 4.5649C12.8442 4.46837 12.8231 4.36455 12.8223 4.25949C12.8214 4.15444 12.8407 4.05025 12.8792 3.95301C12.9176 3.85578 12.9744 3.76744 13.0463 3.69315C13.1181 3.61886 13.2035 3.56011 13.2975 3.52033C13.3915 3.48054 13.4922 3.46052 13.5938 3.46144C13.6953 3.46235 13.7957 3.48418 13.889 3.52564C13.9823 3.56711 14.0667 3.62739 14.1373 3.70295L17.1043 6.77205C17.6779 7.36555 18.0001 8.17039 18.0001 9.00959C18.0001 9.84879 17.6779 10.6536 17.1043 11.2471H17.1074Z" fill="black" />
              <path d="M5.45192 1.5H3.89423C3.27454 1.5 2.68023 1.73705 2.24205 2.15901C1.80386 2.58097 1.55769 3.15326 1.55769 3.75V14.25C1.55769 14.8467 1.80386 15.419 2.24205 15.841C2.68023 16.2629 3.27454 16.5 3.89423 16.5H5.45192C5.65849 16.5 5.85659 16.579 6.00265 16.7197C6.14871 16.8603 6.23077 17.0511 6.23077 17.25C6.23077 17.4489 6.14871 17.6397 6.00265 17.7803C5.85659 17.921 5.65849 18 5.45192 18H3.89423C2.8618 17.9988 1.872 17.6033 1.14196 16.9003C0.411918 16.1973 0.0012367 15.2442 0 14.25L0 3.75C0.0012367 2.7558 0.411918 1.80267 1.14196 1.09966C1.872 0.39666 2.8618 0.00119019 3.89423 0H5.45192C5.65849 0 5.85659 0.0790176 6.00265 0.219669C6.14871 0.360321 6.23077 0.551088 6.23077 0.75C6.23077 0.948912 6.14871 1.13968 6.00265 1.28033C5.85659 1.42098 5.65849 1.5 5.45192 1.5Z" fill="black" />
            </svg>
            Visit
          </button>
        </div>

      </div>

    </div>
  );
}