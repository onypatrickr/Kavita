﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using API.Services;
using Kavita.Common;

namespace API.Data
{
    /// <summary>
    /// A Migration to migrate config related files to the config/ directory for installs prior to v0.4.9.
    /// </summary>
    public static class MigrateConfigFiles
    {
        private static readonly List<string> LooseLeafFiles = new List<string>()
        {
            "appsettings.json",
            "appsettings.Development.json",
            "kavita.db",
        };

        private static readonly List<string> AppFolders = new List<string>()
        {
            "covers",
            "stats",
            "logs",
            "backups",
            "cache",
            "temp"
        };


        /// <summary>
        /// In v0.4.8 we moved all config files to config/ to match with how docker was setup. This will move all config files from current directory
        /// to config/
        /// </summary>
        public static void Migrate(bool isDocker, IDirectoryService directoryService)
        {
            Console.WriteLine("Checking if migration to config/ is needed");

            if (isDocker)
            {
                if (Configuration.LogPath.Contains("config"))
                {
                    Console.WriteLine("Migration to config/ not needed");
                    return;
                }

                Console.WriteLine(
                    "Migrating files from pre-v0.4.8. All Kavita config files are now located in config/");

                CopyAppFolders(directoryService);
                DeleteAppFolders(directoryService);

                UpdateConfiguration();

                Console.WriteLine("Migration complete. All config files are now in config/ directory");
                return;
            }

            if (new FileInfo(Configuration.AppSettingsFilename).Exists)
            {
                Console.WriteLine("Migration to config/ not needed");
                return;
            }

            Console.WriteLine(
                "Migrating files from pre-v0.4.8. All Kavita config files are now located in config/");

            Console.WriteLine($"Creating {directoryService.ConfigDirectory}");
            directoryService.ExistOrCreate(directoryService.ConfigDirectory);

            try
            {
                CopyLooseLeafFiles(directoryService);

                CopyAppFolders(directoryService);

                // Then we need to update the config file to point to the new DB file
                UpdateConfiguration();
            }
            catch (Exception)
            {
                Console.WriteLine("There was an exception during migration. Please move everything manually.");
                return;
            }

            // Finally delete everything in the source directory
            Console.WriteLine("Removing old files");
            DeleteLooseFiles(directoryService);
            DeleteAppFolders(directoryService);
            Console.WriteLine("Removing old files...DONE");

            Console.WriteLine("Migration complete. All config files are now in config/ directory");
        }

        private static void DeleteAppFolders(IDirectoryService directoryService)
        {
            foreach (var folderToDelete in AppFolders)
            {
                if (!new DirectoryInfo(Path.Join(Directory.GetCurrentDirectory(), folderToDelete)).Exists) continue;

                directoryService.ClearAndDeleteDirectory(Path.Join(Directory.GetCurrentDirectory(), folderToDelete));
            }
        }

        private static void DeleteLooseFiles(IDirectoryService directoryService)
        {
            var configFiles = LooseLeafFiles.Select(file => new FileInfo(Path.Join(Directory.GetCurrentDirectory(), file)))
                .Where(f => f.Exists);
            directoryService.DeleteFiles(configFiles.Select(f => f.FullName));
        }

        private static void CopyAppFolders(IDirectoryService directoryService)
        {
            Console.WriteLine("Moving folders to config");

                foreach (var folderToMove in AppFolders)
                {
                    if (new DirectoryInfo(Path.Join(directoryService.ConfigDirectory, folderToMove)).Exists) continue;

                    try
                    {
                        directoryService.CopyDirectoryToDirectory(
                            Path.Join(directoryService.FileSystem.Directory.GetCurrentDirectory(), folderToMove),
                            Path.Join(directoryService.ConfigDirectory, folderToMove));
                    }
                    catch (Exception)
                    {
                        /* Swallow Exception */
                    }
                }


            Console.WriteLine("Moving folders to config...DONE");
        }

        private static void CopyLooseLeafFiles(IDirectoryService directoryService)
        {
            var configFiles = LooseLeafFiles.Select(file => new FileInfo(Path.Join(directoryService.FileSystem.Directory.GetCurrentDirectory(), file)))
                .Where(f => f.Exists);
            // First step is to move all the files
            Console.WriteLine("Moving files to config/");
            foreach (var fileInfo in configFiles)
            {
                try
                {
                    fileInfo.CopyTo(Path.Join(directoryService.ConfigDirectory, fileInfo.Name));
                }
                catch (Exception)
                {
                    /* Swallow exception when already exists */
                }
            }

            Console.WriteLine("Moving files to config...DONE");
        }

        private static void UpdateConfiguration()
        {
            Console.WriteLine("Updating appsettings.json to new paths");
            Configuration.DatabasePath = "config//kavita.db";
            Configuration.LogPath = "config//logs/kavita.log";
            Console.WriteLine("Updating appsettings.json to new paths...DONE");
        }
    }
}
