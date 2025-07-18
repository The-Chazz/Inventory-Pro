# Inventory Pro

A locally hosted inventory management system built with modern web technologies.

## Features

- Real-time inventory tracking
- Sales management
- User access control
- Dashboard analytics
- Report generation
- Point of sale functionality
- Low stock alerts
- Barcode scanning support
- Loss tracking
- Profit analysis

## Installation

### Quick Installation (Windows)

For Windows users, use the automated launcher script:

1. Download or clone the repository:
```bash
git clone https://github.com/The-Chazz/Inventory-Pro.git
cd Inventory-Pro
```

2. Run the automated installer:
```batch
Launcher.bat
```

The `Launcher.bat` script will automatically:
- ✅ Check and install Node.js if needed
- ✅ Install all required dependencies
- ✅ Configure PM2 service for persistent operation
- ✅ Update dependencies safely (preserving UI styling)
- ✅ Build and start the application
- ✅ Open the application in your default browser

**Prerequisites:**
- Windows 10/11
- Administrator privileges (recommended)
- Internet connection (for Node.js download if needed)

### Manual Installation

If you prefer manual installation or are using a different operating system:

1. Clone the repository:
```bash
git clone https://github.com/The-Chazz/Inventory-Pro.git
cd Inventory-Pro
```

2. Install dependencies:
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. Configure the application:
- Copy `.env.example` to `.env` (if available)
- Update environment variables as needed

4. Start the development servers:
```bash
# Start server (from root directory)
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
inventory-pro/
├── client/            # Frontend React application
│   ├── public/        # Static assets
│   │   ├── fontawesome/  # Local FontAwesome files
│   │   └── icons/     # Application icons
│   ├── src/          # Source code
│   │   ├── components/  # Reusable UI components
│   │   ├── context/   # React context providers
│   │   ├── hooks/     # Custom React hooks
│   │   ├── lib/       # Utility libraries
│   │   ├── pages/     # Page components
│   │   └── utils/     # Utility functions
│   ├── components.json  # UI component configuration
│   ├── postcss.config.js  # PostCSS configuration
│   ├── tailwind.config.ts  # Tailwind CSS configuration
│   └── vite.config.ts    # Vite build configuration
├── server/           # Backend Node.js server
│   ├── data/         # File-based data storage
│   ├── uploads/      # File upload storage
│   ├── config.ts     # Server configuration
│   ├── fileStorage.ts  # File-based storage implementation
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API routes
│   └── utils/        # Server utility functions
├── shared/           # Shared code between client and server
│   └── schema.ts     # TypeScript type definitions
├── docs/            # Documentation
├── dist/            # Build output
└── package.json     # Project dependencies and scripts
```

## Development

### Architecture

The application follows a client-server architecture:
- **Frontend**: React with TypeScript, Vite for bundling
- **Backend**: Node.js with Express
- **Data Storage**: File-based JSON storage (no database required)
- **Styling**: Tailwind CSS with shadcn/ui components

### Key Components

1. **User Management**
   - Authentication and authorization
   - Role-based access control (Administrator, Manager, Cashier, Stocker)
   - User activity tracking

2. **Inventory Management**
   - Stock tracking with real-time updates
   - Low stock alerts and reorder notifications
   - Category management
   - Barcode scanning support
   - Bulk import via CSV

3. **Sales System**
   - Point of sale interface
   - Sales history and tracking
   - Refund processing
   - Receipt generation

4. **Dashboard**
   - Real-time statistics
   - Sales analytics
   - Inventory insights
   - User activity monitoring

5. **Reporting**
   - Profit tracking
   - Loss reports
   - Sales analytics
   - Custom date ranges

### API Endpoints

#### Authentication
- `POST /api/login` - User authentication

#### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get specific item
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

#### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get specific sale
- `POST /api/sales` - Create new sale
- `POST /api/sales/:id/refund` - Process refund

#### Statistics
- `GET /api/stats` - Get dashboard statistics

### File Storage

The application uses file-based storage with JSON files located in `server/data/`:
- `users.json` - User accounts and settings
- `inventory.json` - Inventory items
- `sales.json` - Sales transactions
- `losses.json` - Loss records
- `stats.json` - Dashboard statistics
- `settings.json` - Application settings

### Service Management

### Windows Service (PM2)

When using `Launcher.bat`, the application is automatically configured as a Windows service using PM2:

**Service Commands:**
```batch
# View service status
pm2 status

# View application logs
pm2 logs inventory-pro

# Restart the service
pm2 restart inventory-pro

# Stop the service
pm2 stop inventory-pro

# Start the service
pm2 start inventory-pro

# Remove the service
pm2 delete inventory-pro
```

**Service Features:**
- ✅ **Auto-start on boot**: Service starts automatically when Windows boots
- ✅ **Auto-restart**: Automatically restarts if the application crashes
- ✅ **Log management**: Centralized logging with rotation
- ✅ **Memory monitoring**: Restarts if memory usage exceeds 1GB
- ✅ **Process monitoring**: Real-time status and health checks

**Log Files Location:**
- Error logs: `logs/err.log`
- Output logs: `logs/out.log`
- Combined logs: `logs/combined.log`
- Launcher logs: `launcher.log`

### Launcher.bat Features

The automated launcher provides:

1. **Node.js Management**
   - Automatic detection and installation
   - Support for bundled installers
   - Version verification and updates

2. **Dependency Management**
   - Smart dependency updates (excludes UI packages)
   - Pins critical dependencies to prevent breaking changes
   - Handles missing node_modules automatically

3. **Service Configuration**
   - PM2 global installation and setup
   - Windows startup service configuration
   - Automatic service recovery and monitoring

4. **Application Management**
   - Automated build process
   - Service startup and health checks
   - Browser launch with application URL

5. **Error Handling**
   - Comprehensive error logging
   - User-friendly error messages
   - Recovery suggestions and troubleshooting

### Troubleshooting the Launcher

**Common Issues:**

1. **"Node.js not found"**
   - Ensure you have internet connection for download
   - Run as Administrator
   - Place Node.js installer in the root directory as `node-installer.msi`

2. **"Permission denied" errors**
   - Run Command Prompt as Administrator
   - Check antivirus software isn't blocking the installation

3. **"PM2 installation failed"**
   - Verify npm is working correctly
   - Check internet connection
   - Try running `npm install -g pm2` manually

4. **"Application not responding"**
   - Check if port 5000 is available
   - Review logs: `pm2 logs inventory-pro`
   - Try restarting: `pm2 restart inventory-pro`

5. **"Build failed"**
   - Ensure all dependencies are installed
   - Check for TypeScript errors: `npm run check`
   - Try manual build: `npm run build`

**Reset Instructions:**
If you need to completely reset the installation:
```batch
# Stop and remove PM2 service
pm2 stop inventory-pro
pm2 delete inventory-pro
pm2 kill

# Remove node_modules and rebuild
rmdir /s /q node_modules
del package-lock.json
npm install

# Run launcher again
Launcher.bat
```

### Development Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check
```

## Production Deployment

### Windows Production Deployment

For production deployment on Windows, use the `Launcher.bat` script which automatically:

1. **Builds the application for production**
2. **Configures PM2 service** for persistent operation
3. **Sets up automatic startup** on system boot
4. **Provides service management** capabilities

### Manual Production Deployment

For other operating systems or manual deployment:

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. (Optional) Use PM2 for service management:
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name inventory-pro

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

The built files will be in the `dist/` directory.

## Configuration

### Environment Variables

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 5000)
- `SESSION_SECRET` - Session encryption secret
- `SESSION_MAX_AGE` - Session timeout in milliseconds

### Features Configuration

- **File Storage**: Always enabled, no database required
- **Upload Limits**: 10MB for images and files
- **Session Timeout**: 2 hours default
- **Auto-save**: Real-time data persistence

## Security

- Input validation using Zod schemas
- Session-based authentication
- CSRF protection
- Secure headers with Helmet
- File upload restrictions
- SQL injection prevention (N/A - file-based storage)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use existing component patterns
- Add proper error handling
- Update documentation for new features
- Test all API endpoints
- Ensure responsive design

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the port in `.env` file or use `PORT=3000 npm run dev`
   - For the service: modify `ecosystem.config.js` and restart with `pm2 restart inventory-pro`

2. **Permission errors**
   - Run as Administrator (Windows)
   - Ensure write permissions for `server/data/` and `server/uploads/`
   - Check antivirus software isn't blocking file access

3. **Build failures**
   - Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
   - Check TypeScript errors: `npm run check`
   - Verify all dependencies are installed

4. **FontAwesome icons not loading**
   - Verify local FontAwesome files in `client/public/fontawesome/`
   - Check network connectivity for CDN fallback

5. **Service not starting (Windows)**
   - Verify PM2 is installed: `pm2 --version`
   - Check PM2 logs: `pm2 logs inventory-pro`
   - Restart PM2: `pm2 restart inventory-pro`
   - Check port availability: `netstat -an | findstr :5000`

### Launcher.bat Specific Issues

1. **"Node.js not found" - Solutions:**
   - Ensure internet connection for automatic download
   - Place `node-installer.msi` in the project root directory
   - Download Node.js manually from https://nodejs.org/
   - Run Command Prompt as Administrator

2. **"Permission denied" - Solutions:**
   - Run Command Prompt as Administrator
   - Disable antivirus temporarily during installation
   - Check Windows User Account Control settings
   - Ensure current user has write permissions to the directory

3. **"PM2 installation failed" - Solutions:**
   - Verify npm is working: `npm --version`
   - Check internet connection
   - Clear npm cache: `npm cache clean --force`
   - Try manual installation: `npm install -g pm2`

4. **"Build failed" - Solutions:**
   - Check for TypeScript errors: `npm run check`
   - Verify all dependencies installed: `npm install`
   - Check available disk space
   - Review build logs in `launcher.log`

5. **"Application not responding" - Solutions:**
   - Check if port 5000 is available
   - Review PM2 logs: `pm2 logs inventory-pro`
   - Verify the build was successful
   - Check Windows Firewall settings

### Reset Instructions

If you need to completely reset the installation:

**Windows (using Launcher.bat):**
```batch
# Stop and remove PM2 service
pm2 stop inventory-pro
pm2 delete inventory-pro
pm2 kill

# Remove node_modules and rebuild
rmdir /s /q node_modules
del package-lock.json
del ecosystem.config.js
del launcher.log

# Run launcher again
Launcher.bat
```

**Manual reset:**
```bash
# Stop any running processes
pm2 stop inventory-pro 2>/dev/null || true
pm2 delete inventory-pro 2>/dev/null || true

# Clean installation
rm -rf node_modules package-lock.json dist/ logs/
npm install
npm run build

# Restart manually or run Launcher.bat again
```

### Log Files

When troubleshooting, check these log files:

- **Launcher logs**: `launcher.log` - Installation and setup process
- **PM2 logs**: `pm2 logs inventory-pro` - Application runtime logs
- **Error logs**: `logs/err.log` - Application error messages
- **Output logs**: `logs/out.log` - Application output
- **Combined logs**: `logs/combined.log` - All application logs

### Performance Tips

1. **Memory Usage**: The service is configured to restart if memory usage exceeds 1GB
2. **Automatic Restart**: The service automatically restarts on crashes
3. **Startup**: The service starts automatically on system boot
4. **Monitoring**: Use `pm2 monit` for real-time monitoring

### Support

For issues and questions:
1. Check the troubleshooting section
2. Review log files for error details
3. Verify all prerequisites are met
4. Check the project documentation
5. Create an issue on GitHub with log file contents

## License

[MIT License](LICENSE)

## Acknowledgments

- Built with React and Node.js
- UI components from shadcn/ui
- Icons from FontAwesome
- Styling with Tailwind CSS