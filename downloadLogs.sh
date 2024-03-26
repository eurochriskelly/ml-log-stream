#!/bin/bash
#source /data/web/cre/Batchscripts/_TOOLS/cre-status/common.sh
#includeEnvironment

# download: downloadLogs 20231030 
# viewlogs: downloadLogs view | grep SSL
II() { echo "II $(date --rfc-333=seconds) $@" ; }
DD() { echo "DD $(date --rfc-333=seconds) $@" ; }


RUNNING_SCRIPT_LOCATION=$(dirname "${BASH_SOURCE:-$0}")
USER_ARCH="credits-archive"
PASS_ARCH="Crearc5ive"

LogDate=$1
ENV=$2
ERROR_PORTS=${3:-"8010,8011,8016,TaskServer"}
ERROR_STRING=$4
ACTION=$LogDate
HOST="cre-ml-${ENV}-vm01.launcher.int.abnamro.com"
HOSTPOOL="cre-ml-${ENV}-vm01.launcher.int.abnamro.com,cre-ml-${ENV}-vm02.launcher.int.abnamro.com,cre-ml-${ENV}-vm03.launcher.int.abnamro.com,cre-ml-${ENV}-vm04.launcher.int.abnamro.com, cre-ml-${ENV}-vm05.launcher.int.abnamro.com,cre-ml-${ENV}-vm06.launcher.int.abnamro.com"

LOG_FILE=$(if [[ -n ${LogDate} ]]; then
        let DIFF=($(date +%Y%m%d)-$LogDate)
		if [ "$DIFF" != "0" ]; then
			echo ErrorLog_$DIFF.txt
		else
			echo ErrorLog.txt
		fi
fi)


ALL_HOSTS=$(if [[ -n ${HOSTPOOL} ]]; then
        echo ${HOSTPOOL//,/ }
    else
        echo $HOST
fi)

helpSection() {
    echo "▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇ HELP SECTION ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇"
    echo ""
    echo "USAGE: bash $0 [DATE: 20241231] [ENV: p] [PORTS: 8010,8011,8016]"    
    echo "bash $0 20241231 p 8010,8011"
	printVars
    echo "▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇"
    exit 0
}

printVars(){
	II "============= PRINT VARS =============="
	echo "ENV: ${ENV}"
	echo "Ports: ${ERROR_PORTS}"
	echo "LogDate": ${LogDate}
	echo "LOG_FILE : ${LOG_FILE}"
	echo "ALL_HOSTS: ${ALL_HOSTS}"
	echo "ERROR_STRING: ${ERROR_STRING}"
	echo
}

deleteAllLogs(){
    II "============= DELETE ALL LOGS =============="
	for i in $(find $RUNNING_SCRIPT_LOCATION -mindepth 1 -maxdepth 1 -type d); do rm -rf "$i"; done;
}

backupOldLogs() {
    II "============= BACKUP OLD LOGS =============="
	local backupDate=$(date +%Y%m%d)
	local backupFolder="$RUNNING_SCRIPT_LOCATION/backup/$backupDate"
	
	rm -rf $backupFolder
	for folder in $(find $RUNNING_SCRIPT_LOCATION -mindepth 1 -maxdepth 1 -type d ! -path '*backup'); do		
		fname=$(basename $folder)
		test -d $backupFolder | (
        mkdir -p $backupFolder
        chmod -R 777 $backupFolder
		)
		echo $folder
		mv --backup=numbered $folder "$backupFolder/$fname"
	done
}

downloadLogs() {
    II "============= DOWNLOAD THE LOGS =============="
    for port in ${ERROR_PORTS//,/ }; do		
		local logFolder="${RUNNING_SCRIPT_LOCATION}/${port}"
		test -d $logFolder| (
        mkdir -p $logFolder
        chmod -R 777 $logFolder
		)
		
		for host in ${ALL_HOSTS}; do
		echo "$host:$port"
		status=$(curl -s -k --digest --user "${USER_ARCH}:${PASS_ARCH}" "https://${host}:8001/get-error-log.xqy?filename=${port}_${LOG_FILE}" > "$logFolder/${host}_${port}.txt")
		done
    done
    
}
	
errorLogs(){
    II "============= ERROR LOGS =============="	
    for port in "ErrorLog"; do		
		local logFolder="${RUNNING_SCRIPT_LOCATION}/${port}"
		test -d $logFolder| (
        mkdir -p $logFolder
        chmod -R 777 $logFolder
		)
		
		for host in ${ALL_HOSTS}; do
		echo "$host:$port"
		status=$(curl -s -k --digest --user "${USER_ARCH}:${PASS_ARCH}" "https://${host}:8001/get-error-log.xqy?filename=${LOG_FILE}" > "$logFolder/${host}_${port}.txt")
		done
    done
}

tocheck(){
	for i in $(viewLogs | grep SSL | awk '{print $11}' | awk -F- '{print $2}' | awk -F: '{print $1}' | sort | uniq); do nslookup $i; done;
}


filterLogs(){
	II "=================== FilterLogs: $ERROR_STRING ======================="
	for i in $(find $RUNNING_SCRIPT_LOCATION -mindepth 1 -maxdepth 2 -type f ! -path '*backup' -name "*.txt" );do
	path=$(realpath ${i})

	res=$(cat $path | grep -i -E $ERROR_STRING)
	if [ "$res" ];then
        	II "=================== Filename: $(basename ${i}) ======================="
			echo "${res}"
			echo
	#else 
	# echo "hello"
	fi
	done;

}

printLogs(){
	II "=================== PRINT ALL LOGS ======================="
	for i in $(find $RUNNING_SCRIPT_LOCATION -mindepth 1 -maxdepth 2 -type f ! -path '*backup' -name "*.txt" );do
	path=$(realpath ${i})

	cat $path
	done;

}

viewLogs(){
	II "============= VIEW LOGS -- $ERROR_STRING =============="
	[ -n "$ERROR_STRING" ] && filterLogs $ERROR_STRING || printLogs
}


main(){
	II "started $LogDate"
	if [[ "${ENV}" == "" ]]; then
		helpSection
	fi

	if [[ "$ACTION" == "delete" ]];then
		deleteAllLogs
		II "============= REMOVE DELETE OR PASS DATE TO FETCH LOGS =============="		
    else
		if [[ "$ACTION" == "view" ]];then
			viewLogs
		else
			II "============= FETCH LOGS FOR DATE: $LogDate =============="
			printVars
			backupOldLogs
			downloadLogs
			errorLogs
		fi
    fi
	II "============= DONE =============="
}

main $ACTION $ERROR_STRING
