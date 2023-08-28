# bin bash
mkdir ./public

# Copy all files from the root directory starting with a number (chainID)
allDirectories=$(find . -type f -name '[0-9]*')
for directory in $allDirectories
do
  echo $directory
  cp -rf ../../$directory ./public/
done
