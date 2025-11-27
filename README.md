# Coloracao Manual

A web application for manual color analysis and seasonal classification, designed to help determine a person's color season for hair coloring, makeup, and personal styling.

## Features

- **User Management**: Manage users with facial and eye photos
- **Color Extraction**: Interactive extraction of colors from facial features (eyes, hair, eyebrows, skin, etc.)
- **Mask Analysis**: Position and analyze facial masks for color assessment
- **Pigment Analysis**: Detailed analysis of temperature, intensity, and depth using interactive sliders
- **Season Classification**: Automatic and manual classification into color seasons (Warm, Cool, etc.)
- **Multi-Analysis Support**: Track multiple analyses per user with progress tracking

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: Ant Design, Tailwind CSS
- **Canvas**: Konva.js for interactive color extraction and mask positioning
- **Backend**: Supabase (PostgreSQL, real-time subscriptions)
- **Styling**: Tailwind CSS v4

## Project Structure

- `src/app/` - Next.js app router pages and components
- `src/lib/` - Core utilities, types, and Supabase client
- `supabase/` - Database migrations and configuration
- `public/` - Static assets

## Analysis Steps

1. **Color Extraction**: Extract colors from key facial areas
2. **Mask Analysis**: Position face and analyze color masks
3. **Pigment Analysis**: Adjust sliders for temperature, intensity, and depth comparisons
4. **Final Classification**: Determine and confirm color season
