# bin bash
mkdir -p ./public

# Copy all files from the root directory starting with a number (chainID)
# cp -rf ../../1 ./public/

allDirectories=$(find ../../tokens -maxdepth 1 -type d -name '[0-9]*')
for directory in $allDirectories
do
  cp -rf $directory ./public/tokens/
done

allDirectories=$(find ../../chains -maxdepth 1 -type d -name '[0-9]*')
for directory in $allDirectories
do
  cp -rf $directory ./public/chains/
done
