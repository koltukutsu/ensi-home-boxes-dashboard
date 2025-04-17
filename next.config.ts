import type { NextConfig } from 'next';
import initializeBundleAnalyzer from '@next/bundle-analyzer';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import type { Configuration, NormalModule } from 'webpack';
import webpack from 'webpack';

// Define type for resource in the NormalModuleReplacementPlugin
interface ResourceResolveData {
    request: string;
    contextInfo: { issuer: string };
    context: string;
}

// https://www.npmjs.com/package/@next/bundle-analyzer
const withBundleAnalyzer = initializeBundleAnalyzer({
    enabled: process.env.BUNDLE_ANALYZER_ENABLED === 'true'
});

// https://nextjs.org/docs/pages/api-reference/next-config-js
const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingIncludes: {
        "/*": ["./registry/**/*"],
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
        ],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Add rewrites for Plausible analytics proxy
    // async rewrites() {
    //     return [
    //         {
    //             source: '/js/script.js',
    //             destination: 'https://plausible.io/js/script.js'
    //         },
    //         {
    //             source: '/api/event',
    //             destination: 'https://plausible.io/api/event'
    //         }
    //     ];
    // },
    // Add webpack configuration to handle Node.js modules
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Don't attempt to polyfill or mock Node.js modules for server-side
            
            // Explicitly handle buffer for client-side
            config.plugins.push(
                new webpack.ProvidePlugin({
                    Buffer: ['buffer', 'Buffer'],
                    process: 'process/browser',
                }),
                new webpack.NormalModuleReplacementPlugin(/node:/, (resource: ResourceResolveData) => {
                    const mod = resource.request.replace(/^node:/, '');
                    switch (mod) {
                        case 'buffer':
                            resource.request = 'buffer';
                            break;
                        case 'stream':
                            resource.request = 'stream-browserify';
                            break;
                        case 'util':
                            resource.request = 'util';
                            break;
                        case 'url':
                            resource.request = 'url';
                            break;
                        case 'http':
                            resource.request = 'stream-http';
                            break;
                        case 'https':
                            resource.request = 'https-browserify';
                            break;
                        case 'zlib':
                            resource.request = 'browserify-zlib';
                            break;
                        case 'crypto':
                            resource.request = 'crypto-browserify';
                            break;
                        case 'path':
                            resource.request = 'path-browserify';
                            break;
                        case 'fs':
                            resource.request = 'browserify-fs';
                            break;
                    }
                })
            );
            
            // Fallbacks for node modules
            config.resolve.fallback = {
                ...config.resolve.fallback,
                buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify'),
                util: require.resolve('util/'),
                url: require.resolve('url/'),
                http: require.resolve('stream-http'),
                https: require.resolve('https-browserify'),
                zlib: require.resolve('browserify-zlib'),
                path: require.resolve('path-browserify'),
                crypto: require.resolve('crypto-browserify'),
                fs: false,
                net: false,
                tls: false,
                child_process: false,
            };
        }
        
        return config;
    },
    // headers: async () => {
    //     return [
    //         {
    //             source: '/(.*)',
    //             headers: [
    //                 {
    //                     key: 'Content-Security-Policy',
    //                     value: "default-src 'self'; script-src 'self' https://plausible.io; connect-src 'self' https://plausible.io; img-src 'self' data:;"
    //                 }
    //             ]
    //         }
    //     ];
    // }
};

export default withBundleAnalyzer(nextConfig);
